-- =====================================================================
--  002 — Funny photo stickers (pop up when a friend answers wrong)
--  Run AFTER 001_init.sql (safe to run more than once).
-- =====================================================================

create table if not exists public.stickers (
  id           uuid primary key default gen_random_uuid(),
  quiz_id      uuid not null references public.quizzes(id) on delete cascade,
  storage_path text not null,
  mime_type    text not null check (mime_type in ('image/webp','image/jpeg','image/png')),
  created_at   timestamptz not null default now()
);
create index if not exists idx_stickers_quiz on public.stickers(quiz_id);

alter table public.stickers enable row level security;
revoke all on public.stickers from anon, authenticated;

-- ---------- get_quiz_public: now also returns the stickers ----------
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
             else '[]'::json end,
    'stickers', (select coalesce(json_agg(json_build_object('id', s.id, 'storage_path', s.storage_path, 'mime_type', s.mime_type) order by s.created_at), '[]'::json)
                 from public.stickers s where s.quiz_id = v.id)
  );
end $$;

-- ---------- get_creator_view: now also returns the stickers ----------
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
              from public.voice_clips c where c.quiz_id = v.id),
    'stickers', (select coalesce(json_agg(json_build_object('id', s.id, 'storage_path', s.storage_path, 'mime_type', s.mime_type) order by s.created_at), '[]'::json)
                 from public.stickers s where s.quiz_id = v.id)
  );
end $$;

-- ---------- add_sticker (called after the image was uploaded via signed URL) ----------
create or replace function public.add_sticker(
  p_quiz_id uuid, p_creator_token uuid, p_mime_type text, p_storage_path text)
returns json language plpgsql security definer set search_path = public, storage as $$
declare s public.stickers; n int;
begin
  perform public._assert_creator(p_quiz_id, p_creator_token);
  if p_mime_type not in ('image/webp','image/jpeg','image/png') then raise exception 'bad mime'; end if;
  if left(p_storage_path, 37) <> p_quiz_id::text || '/' then raise exception 'bad path'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'stickers' and name = p_storage_path) then
    raise exception 'file not uploaded';
  end if;
  select count(*) into n from public.stickers where quiz_id = p_quiz_id;
  if n >= 5 then raise exception 'sticker limit reached'; end if;
  insert into public.stickers (quiz_id, storage_path, mime_type)
  values (p_quiz_id, p_storage_path, p_mime_type) returning * into s;
  return json_build_object('id', s.id, 'storage_path', s.storage_path, 'mime_type', s.mime_type);
end $$;

-- ---------- delete_sticker (returns the storage path to remove) ----------
create or replace function public.delete_sticker(p_sticker_id uuid, p_creator_token uuid)
returns text language plpgsql security definer set search_path = public as $$
declare s public.stickers;
begin
  select * into s from public.stickers where id = p_sticker_id;
  if not found then raise exception 'not found'; end if;
  perform public._assert_creator(s.quiz_id, p_creator_token);
  delete from public.stickers where id = s.id;
  return s.storage_path;
end $$;

grant execute on function
  public.get_quiz_public(text),
  public.get_creator_view(text, uuid),
  public.add_sticker(uuid, uuid, text, text),
  public.delete_sticker(uuid, uuid)
to anon, authenticated;

-- ---------- STORAGE BUCKET: public read, 150 KB, images only ----------
-- No write policies → clients can only upload through the Edge Function's signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stickers', 'stickers', true, 153600, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true, file_size_limit = 153600, allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];
