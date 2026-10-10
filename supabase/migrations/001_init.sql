-- =====================================================================
--  كم تعرفني؟  —  Supabase migration
--  Run this whole file in: Supabase Dashboard → SQL Editor → New query
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------- TABLES ----------
create table if not exists public.quizzes (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  title             text not null check (char_length(title) between 1 and 80),
  creator_name      text not null check (char_length(creator_name) between 1 and 40),
  creator_token     uuid not null default gen_random_uuid(),
  use_creator_voice boolean not null default true,
  created_at        timestamptz not null default now()
);

create table if not exists public.questions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  position      int  not null,
  text          text not null check (char_length(text) between 1 and 200),
  options       jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 4),
  correct_index int  not null check (correct_index between 0 and 3),
  unique (quiz_id, position)
);

create table if not exists public.participants (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references public.quizzes(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 30),
  avatar      text not null default '😺',
  score       int  not null default 0,
  total       int  not null default 0,
  finished_at timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.answers (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  question_id    uuid not null references public.questions(id) on delete cascade,
  selected_index int  not null,
  is_correct     boolean not null,
  unique (participant_id, question_id)
);

create table if not exists public.voice_clips (
  id           uuid primary key default gen_random_uuid(),
  quiz_id      uuid not null references public.quizzes(id) on delete cascade,
  kind         text not null check (kind in ('wrong','correct','result_low','result_high')),
  question_id  uuid references public.questions(id) on delete cascade,
  storage_path text not null,
  mime_type    text not null check (mime_type in ('audio/webm','audio/mp4')),
  duration_ms  int  not null check (duration_ms between 500 and 5500),
  created_at   timestamptz not null default now()
);

create index if not exists idx_questions_quiz     on public.questions(quiz_id, position);
create index if not exists idx_participants_quiz  on public.participants(quiz_id);
create index if not exists idx_answers_part       on public.answers(participant_id);
create index if not exists idx_voice_quiz         on public.voice_clips(quiz_id);

-- ---------- RLS: ON everywhere, NO policies = no direct client access ----------
alter table public.quizzes      enable row level security;
alter table public.questions    enable row level security;
alter table public.participants enable row level security;
alter table public.answers      enable row level security;
alter table public.voice_clips  enable row level security;

revoke all on public.quizzes, public.questions, public.participants, public.answers, public.voice_clips
  from anon, authenticated;

-- ---------- INTERNAL HELPERS (not callable from the client) ----------
create or replace function public._gen_slug() returns text
language plpgsql as $$
declare
  chars text := 'abcdefghijkmnpqrstuvwxyz23456789';
  s text; i int;
begin
  loop
    s := '';
    for i in 1..7 loop
      s := s || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.quizzes where slug = s);
  end loop;
  return s;
end $$;

create or replace function public._assert_creator(p_quiz_id uuid, p_token uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.quizzes where id = p_quiz_id and creator_token = p_token) then
    raise exception 'forbidden';
  end if;
end $$;

revoke execute on function public._gen_slug()                    from public, anon, authenticated;
revoke execute on function public._assert_creator(uuid, uuid)    from public, anon, authenticated;

-- ---------- RPC: create_quiz ----------
-- p_questions = [{ "text": "...", "options": ["a","b"], "correct_index": 0 }, ...]
create or replace function public.create_quiz(p_title text, p_creator_name text, p_questions jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_quiz public.quizzes;
  q jsonb; i int := 0; n int; qid uuid; ids uuid[] := '{}';
begin
  if p_questions is null or jsonb_typeof(p_questions) <> 'array' then raise exception 'invalid questions'; end if;
  n := jsonb_array_length(p_questions);
  if n < 1 or n > 30 then raise exception 'questions count must be between 1 and 30'; end if;

  insert into public.quizzes (slug, title, creator_name)
  values (public._gen_slug(), left(trim(p_title), 80), left(trim(p_creator_name), 40))
  returning * into v_quiz;

  for q in select * from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(q->'options') <> 'array'
       or jsonb_array_length(q->'options') < 2 or jsonb_array_length(q->'options') > 4 then
      raise exception 'options must be 2..4';
    end if;
    if (q->>'correct_index')::int < 0 or (q->>'correct_index')::int > jsonb_array_length(q->'options') - 1 then
      raise exception 'bad correct_index';
    end if;
    insert into public.questions (quiz_id, position, text, options, correct_index)
    values (v_quiz.id, i, left(trim(q->>'text'), 200), q->'options', (q->>'correct_index')::int)
    returning id into qid;
    ids := ids || qid;
    i := i + 1;
  end loop;

  return json_build_object('id', v_quiz.id, 'slug', v_quiz.slug,
                           'creator_token', v_quiz.creator_token, 'question_ids', to_json(ids));
end $$;

-- ---------- RPC: get_quiz_public (NO correct_index, nothing secret) ----------
create or replace function public.get_quiz_public(p_slug text)
returns json language plpgsql security definer set search_path = public as $$
declare v public.quizzes;
begin
  select * into v from public.quizzes where slug = p_slug;
  if not found then return null; end if;
  return json_build_object(
    'id', v.id, 'slug', v.slug, 'title', v.title, 'creator_name', v.creator_name,
    'use_creator_voice', v.use_creator_voice,
    'questions', (select coalesce(json_agg(json_build_object('id', qq.id, 'position', qq.position, 'text', qq.text, 'options', qq.options) order by qq.position), '[]'::json)
                  from public.questions qq where qq.quiz_id = v.id),
    'clips', case when v.use_creator_voice then
               (select coalesce(json_agg(json_build_object('id', c.id, 'kind', c.kind, 'question_id', c.question_id,
                        'storage_path', c.storage_path, 'mime_type', c.mime_type, 'duration_ms', c.duration_ms) order by c.created_at), '[]'::json)
                from public.voice_clips c where c.quiz_id = v.id)
             else '[]'::json end
  );
end $$;

-- ---------- RPC: join_quiz ----------
create or replace function public.join_quiz(p_slug text, p_name text, p_avatar text)
returns json language plpgsql security definer set search_path = public as $$
declare v public.quizzes; pid uuid; n int;
begin
  select * into v from public.quizzes where slug = p_slug;
  if not found then raise exception 'quiz not found'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 1 then raise exception 'name required'; end if;
  select count(*) into n from public.questions where quiz_id = v.id;
  insert into public.participants (quiz_id, name, avatar, total)
  values (v.id, left(trim(p_name), 30), left(coalesce(nullif(p_avatar, ''), '😺'), 8), n)
  returning id into pid;
  return json_build_object('id', pid, 'total', n);
end $$;

-- ---------- RPC: submit_answer ----------
create or replace function public.submit_answer(p_participant_id uuid, p_question_id uuid, p_selected_index int)
returns json language plpgsql security definer set search_path = public as $$
declare p public.participants; qn public.questions; ok boolean;
begin
  select * into p from public.participants where id = p_participant_id;
  if not found then raise exception 'participant not found'; end if;
  if p.finished_at is not null then raise exception 'already finished'; end if;
  select * into qn from public.questions where id = p_question_id and quiz_id = p.quiz_id;
  if not found then raise exception 'question not found'; end if;
  if p_selected_index < 0 or p_selected_index >= jsonb_array_length(qn.options) then
    raise exception 'bad index';
  end if;
  ok := (p_selected_index = qn.correct_index);
  begin
    insert into public.answers (participant_id, question_id, selected_index, is_correct)
    values (p.id, qn.id, p_selected_index, ok);
  exception when unique_violation then
    raise exception 'already answered';
  end;
  return json_build_object('is_correct', ok, 'correct_index', qn.correct_index);
end $$;

-- ---------- RPC: finish_quiz (+ realtime broadcast) ----------
create or replace function public.finish_quiz(p_participant_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare p public.participants; r int; v_slug text;
begin
  select * into p from public.participants where id = p_participant_id;
  if not found then raise exception 'participant not found'; end if;
  if p.finished_at is null then
    update public.participants
       set score = (select count(*) from public.answers a where a.participant_id = p.id and a.is_correct),
           finished_at = now()
     where id = p.id;
    select * into p from public.participants where id = p_participant_id;
    select slug into v_slug from public.quizzes where id = p.quiz_id;
    -- Tell open leaderboards to refresh. Never let a realtime hiccup break the quiz.
    begin
      perform realtime.send(json_build_object('id', p.id)::jsonb, 'finished', 'lb:' || v_slug, false);
    exception when others then null;
    end;
  end if;
  select 1 + count(*) into r from public.participants
   where quiz_id = p.quiz_id and finished_at is not null and score > p.score;
  return json_build_object('score', p.score, 'total', p.total, 'rank', r);
end $$;

-- ---------- RPC: get_leaderboard ----------
create or replace function public.get_leaderboard(p_slug text)
returns json language plpgsql security definer set search_path = public as $$
declare v public.quizzes;
begin
  select * into v from public.quizzes where slug = p_slug;
  if not found then return null; end if;
  return json_build_object(
    'quiz', json_build_object('title', v.title, 'creator_name', v.creator_name),
    'rows', coalesce((
      select json_agg(r order by r.score desc, r.finished_at asc)
      from (
        select pp.id, pp.name, pp.avatar, pp.score, pp.total, pp.finished_at,
               rank() over (order by pp.score desc) as rank
        from public.participants pp
        where pp.quiz_id = v.id and pp.finished_at is not null
      ) r), '[]'::json)
  );
end $$;

-- ---------- RPC: get_creator_view (private) ----------
create or replace function public.get_creator_view(p_slug text, p_creator_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v public.quizzes;
begin
  select * into v from public.quizzes where slug = p_slug and creator_token = p_creator_token;
  if not found then raise exception 'forbidden'; end if;
  return json_build_object(
    'quiz', json_build_object('id', v.id, 'slug', v.slug, 'title', v.title,
                              'creator_name', v.creator_name, 'use_creator_voice', v.use_creator_voice),
    'questions', (select coalesce(json_agg(json_build_object('id', qq.id, 'position', qq.position, 'text', qq.text,
                         'options', qq.options, 'correct_index', qq.correct_index) order by qq.position), '[]'::json)
                  from public.questions qq where qq.quiz_id = v.id),
    'participants', coalesce((
      select json_agg(json_build_object(
        'id', p.id, 'name', p.name, 'avatar', p.avatar, 'score', p.score, 'total', p.total, 'finished_at', p.finished_at,
        'answers', (select coalesce(json_agg(json_build_object('question_id', a.question_id,
                      'selected_index', a.selected_index, 'is_correct', a.is_correct)), '[]'::json)
                    from public.answers a where a.participant_id = p.id)
      ) order by p.score desc, p.finished_at asc)
      from public.participants p where p.quiz_id = v.id and p.finished_at is not null), '[]'::json),
    'clips', (select coalesce(json_agg(json_build_object('id', c.id, 'kind', c.kind, 'question_id', c.question_id,
                       'storage_path', c.storage_path, 'mime_type', c.mime_type, 'duration_ms', c.duration_ms)
                       order by c.created_at), '[]'::json)
              from public.voice_clips c where c.quiz_id = v.id)
  );
end $$;

-- ---------- RPC: add_voice_clip ----------
-- Called AFTER the file was uploaded through the Edge Function's signed URL.
create or replace function public.add_voice_clip(
  p_quiz_id uuid, p_creator_token uuid, p_kind text, p_question_id uuid,
  p_mime_type text, p_duration_ms int, p_storage_path text)
returns json language plpgsql security definer set search_path = public, storage as $$
declare c public.voice_clips; n int;
begin
  perform public._assert_creator(p_quiz_id, p_creator_token);
  if p_kind not in ('wrong','correct','result_low','result_high') then raise exception 'bad kind'; end if;
  if p_mime_type not in ('audio/webm','audio/mp4') then raise exception 'bad mime'; end if;
  if p_duration_ms < 500 or p_duration_ms > 5500 then raise exception 'bad duration'; end if;
  if p_question_id is not null then
    if p_kind <> 'wrong' then raise exception 'per-question clips are only for wrong answers'; end if;
    if not exists (select 1 from public.questions where id = p_question_id and quiz_id = p_quiz_id) then
      raise exception 'question not in quiz';
    end if;
  end if;
  if left(p_storage_path, 37) <> p_quiz_id::text || '/' then raise exception 'bad path'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'voice-clips' and name = p_storage_path) then
    raise exception 'file not uploaded';
  end if;
  select count(*) into n from public.voice_clips
   where quiz_id = p_quiz_id and kind = p_kind and question_id is not distinct from p_question_id;
  if n >= case when p_question_id is null then 3 else 1 end then raise exception 'slot full'; end if;

  insert into public.voice_clips (quiz_id, kind, question_id, storage_path, mime_type, duration_ms)
  values (p_quiz_id, p_kind, p_question_id, p_storage_path, p_mime_type, p_duration_ms)
  returning * into c;
  return json_build_object('id', c.id, 'kind', c.kind, 'question_id', c.question_id,
                           'storage_path', c.storage_path, 'mime_type', c.mime_type, 'duration_ms', c.duration_ms);
end $$;

-- ---------- RPC: delete_voice_clip (returns the storage path to remove) ----------
create or replace function public.delete_voice_clip(p_clip_id uuid, p_creator_token uuid)
returns text language plpgsql security definer set search_path = public as $$
declare c public.voice_clips;
begin
  select * into c from public.voice_clips where id = p_clip_id;
  if not found then raise exception 'not found'; end if;
  perform public._assert_creator(c.quiz_id, p_creator_token);
  delete from public.voice_clips where id = c.id;
  return c.storage_path;
end $$;

-- ---------- RPC: set_use_creator_voice ----------
create or replace function public.set_use_creator_voice(p_quiz_id uuid, p_creator_token uuid, p_enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._assert_creator(p_quiz_id, p_creator_token);
  update public.quizzes set use_creator_voice = p_enabled where id = p_quiz_id;
end $$;

-- ---------- Allow the client to call ONLY the public RPCs ----------
grant execute on function
  public.create_quiz(text, text, jsonb),
  public.get_quiz_public(text),
  public.join_quiz(text, text, text),
  public.submit_answer(uuid, uuid, int),
  public.finish_quiz(uuid),
  public.get_leaderboard(text),
  public.get_creator_view(text, uuid),
  public.add_voice_clip(uuid, uuid, text, uuid, text, int, text),
  public.delete_voice_clip(uuid, uuid),
  public.set_use_creator_voice(uuid, uuid, boolean)
to anon, authenticated;

-- ---------- STORAGE BUCKET: public read, 300 KB, webm/mp4 only ----------
-- No INSERT/UPDATE/DELETE policies on storage.objects → clients can never upload directly.
-- Uploads happen only through signed upload URLs issued by the `voice-upload` Edge Function.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-clips', 'voice-clips', true, 307200, array['audio/webm', 'audio/mp4'])
on conflict (id) do update
  set public = true, file_size_limit = 307200, allowed_mime_types = array['audio/webm', 'audio/mp4'];
