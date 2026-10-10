"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Mascot, { Mood } from "@/components/Mascot";
import BigButton from "@/components/BigButton";
import Screen from "@/components/Screen";
import VoiceSlot from "@/components/VoiceSlot";
import { T } from "@/lib/phrases";
import { clipUrl } from "@/lib/supabase";
import { deleteClip, getCreatorView, setUseCreatorVoice, subscribeLeaderboard, uploadClip } from "@/lib/api";
import { getMyQuizzes, getToken, saveMyQuiz } from "@/lib/local";
import type { CreatorView, RecResult, VoiceKind } from "@/lib/types";

function Manage() {
  const { slug } = useParams<{ slug: string }>();
  const sp = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<CreatorView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"people" | "voices">("people");
  const [open, setOpen] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [openQ, setOpenQ] = useState<string | null>(null);

  const load = useCallback(async (t: string) => {
    try { setView(await getCreatorView(slug, t)); setError(null); }
    catch { setError(T.manage.forbidden); }
  }, [slug]);

  useEffect(() => {
    const t = sp.get("t") || getToken(slug);
    if (!t) { setError(T.manage.forbidden); return; }
    setToken(t);
    load(t);
    const off = subscribeLeaderboard(slug, () => load(t));
    return () => off();
  }, [slug, sp, load]);

  // remember the token on this device once it is proven valid
  useEffect(() => {
    if (view && token && !getMyQuizzes().some((q) => q.slug === slug))
      saveMyQuiz({ slug, quiz_id: view.quiz.id, title: view.quiz.title, creator_name: view.quiz.creator_name, token, created_at: Date.now() });
  }, [view, token, slug]);

  if (error) return <Screen><div className="flex flex-col items-center gap-5 pt-10 text-center"><Mascot mood="wrong" size={130} /><p className="font-title text-2xl font-bold">{error}</p><BigButton href="/" color="grape">{T.backHome}</BigButton></div></Screen>;
  if (!view || !token) return <Screen><div className="flex flex-col items-center pt-16"><Mascot size={130} /><p className="mt-3 font-bold">{T.loading}</p></div></Screen>;

  const quizId = view.quiz.id;
  const add = async (kind: VoiceKind, questionId: string | null, r: RecResult) => {
    await uploadClip({ quizId, token, kind, questionId, blob: r.blob, mime: r.mime, durationMs: r.durationMs });
    await load(token);
  };
  const del = async (id: string) => { await deleteClip(quizId, token, id); await load(token); };
  const items = (kind: VoiceKind, qid: string | null) =>
    view.clips.filter((c) => c.kind === kind && c.question_id === qid).map((c) => ({ id: c.id, url: clipUrl(c.storage_path), durationMs: c.duration_ms }));
  const toggle = async () => {
    const v = !view.quiz.use_creator_voice;
    setView({ ...view, quiz: { ...view.quiz, use_creator_voice: v } });
    try { await setUseCreatorVoice(quizId, token, v); } catch { load(token); }
  };
  const mood: Mood = recording ? "listening" : "idle";

  return (
    <Screen>
      <div className="flex flex-col items-center text-center">
        <Mascot mood={mood} size={110} />
        <h1 className="font-title text-3xl font-bold">{T.manage.heading}</h1>
        <p className="text-ink/70">{view.quiz.title}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 shadow-soft">
        {(["people", "voices"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl py-2 font-title text-lg font-bold transition-colors ${tab === t ? "bg-grape text-white" : "text-ink/60"}`}>
            {t === "people" ? `${T.manage.tabParticipants} (${view.participants.length})` : `🎤 ${T.manage.tabVoices}`}
          </button>
        ))}
      </div>

      {tab === "people" && (
        <div className="mt-4 space-y-3">
          {view.participants.length === 0 && <div className="card text-center text-ink/70">{T.manage.noParticipants}</div>}
          {view.participants.map((p, i) => (
            <motion.div layout key={p.id} className="card !p-4">
              <button className="flex w-full items-center gap-3 text-right" onClick={() => setOpen(open === p.id ? null : p.id)}>
                <span className="w-8 font-title text-xl font-bold">{i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}</span>
                <span className="text-3xl">{p.avatar}</span>
                <span className="flex-1 truncate font-title text-xl font-bold">{p.name}</span>
                <span className="rounded-full bg-lav px-3 py-1 font-bold text-grape">{p.score}/{p.total}</span>
              </button>
              <AnimatePresence>
                {open === p.id && (
                  <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 space-y-2 overflow-hidden">
                    <li className="text-sm font-bold text-ink/60">{T.manage.answersOf(p.name)}</li>
                    {view.questions.map((q, qi) => {
                      const a = p.answers.find((x) => x.question_id === q.id);
                      return (
                        <li key={q.id} className={`rounded-2xl p-3 text-sm ${a?.is_correct ? "bg-mint/25" : "bg-pink/20"}`}>
                          <div className="font-bold">{qi + 1}. {q.text}</div>
                          <div>{a?.is_correct ? "✅" : "❌"} {T.manage.theirAnswer} {a ? q.options[a.selected_index] : "—"}</div>
                          {!a?.is_correct && <div className="text-ink/70">{T.manage.correctAnswer} {q.options[q.correct_index]}</div>}
                        </li>
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          <BigButton href={`/q/${slug}/leaderboard`} color="sky" small>🏆 {T.home.leaderboard}</BigButton>
          <BigButton href={`/share/${slug}`} color="ghost" small>📤 {T.manage.shareLink}</BigButton>
        </div>
      )}

      {tab === "voices" && (
        <div className="mt-4 space-y-4">
          <div className="card flex items-center justify-between gap-3">
            <div>
              <div className="font-title text-lg font-bold">{T.manage.voiceToggle}</div>
              {!view.quiz.use_creator_voice && <div className="text-sm text-ink/60">{T.manage.voiceToggleOffNote}</div>}
            </div>
            <button onClick={toggle} role="switch" aria-checked={view.quiz.use_creator_voice}
              className={`relative h-9 w-16 shrink-0 rounded-full transition-colors ${view.quiz.use_creator_voice ? "bg-mint" : "bg-ink/20"}`}>
              <motion.span layout className="absolute top-1 h-7 w-7 rounded-full bg-white shadow" style={{ [view.quiz.use_creator_voice ? "right" : "left"]: 4 }} />
            </button>
          </div>

          {T.voice.slots.map((s) => (
            <VoiceSlot key={s.kind} title={s.title} hints={s.hints} max={3} items={items(s.kind, null)}
              onAdd={(r) => add(s.kind, null, r)} onDelete={del} onRecordingChange={setRecording} disabled={recording} />
          ))}

          <h2 className="pt-2 font-title text-xl font-bold">{T.manage.perQuestionHeading}</h2>
          {view.questions.map((q, i) => (
            <div key={q.id} className="card !p-4">
              <button className="flex w-full items-center justify-between gap-2 text-right font-bold" onClick={() => setOpenQ(openQ === q.id ? null : q.id)}>
                <span>{i + 1}. {q.text}</span><span>{items("wrong", q.id).length ? "🎤✓" : "🎤"}</span>
              </button>
              {openQ === q.id && (
                <div className="mt-3">
                  <VoiceSlot title={T.voice.perQuestionTitle} max={1} items={items("wrong", q.id)} onAdd={(r) => add("wrong", q.id, r)} onDelete={del} onRecordingChange={setRecording} disabled={recording} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Screen>
  );
}

export default function ManagePage() {
  return <Suspense fallback={null}><Manage /></Suspense>;
}
