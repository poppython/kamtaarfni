"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import Mascot, { Mood } from "./Mascot";
import BigButton from "./BigButton";
import Screen from "./Screen";
import StickerBurst from "./StickerBurst";
import PetSays from "./PetSays";
import { PET_LINES, T } from "@/lib/phrases";
import { audio } from "@/lib/audio";
import { finishQuiz, getQuizPublic, joinQuiz, submitAnswer, toClipInfo, toStickerUrl } from "@/lib/api";
import { clearPlay, getPlay, savePlay, SavedPlay } from "@/lib/local";
import type { QuizPublic } from "@/lib/types";

type Phase = "loading" | "missing" | "landing" | "playing" | "drumroll" | "result";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Game({ slug }: { slug: string }) {
  const [quiz, setQuiz] = useState<QuizPublic | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(T.avatars[0]);
  const [pid, setPid] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [fb, setFb] = useState<{ ok: boolean; correct: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; total: number; rank: number } | null>(null);
  const [prev, setPrev] = useState<SavedPlay | null>(null);
  const [mood, setMood] = useState<Mood>("idle");
  const [moodKey, setMoodKey] = useState(0);
  const [talking, setTalking] = useState(false);
  const [caption, setCaption] = useState(false);
  const [burst, setBurst] = useState(0);
  const alive = useRef(true);
  const stickerUrls = (quiz?.stickers ?? []).map(toStickerUrl); // older DBs may not have stickers yet

  useEffect(() => {
    alive.current = true;
    (async () => {
      try {
        const q = await getQuizPublic(slug);
        if (!alive.current) return;
        if (!q) return setPhase("missing");
        setQuiz(q);
        const p = getPlay(slug);
        if (p) { setPrev(p); setName(p.name); setAvatar(p.avatar); }
        setPhase("landing");
      } catch { setPhase("missing"); }
    })();
    return () => { alive.current = false; audio.stopVoice(); };
  }, [slug]);

  const react = useCallback((event: "wrong" | "correct" | "result_low" | "result_high", questionId?: string) => {
    audio.playVoice(event, {
      questionId,
      onStart: (src) => { setTalking(true); setCaption(src === "creator"); },
      onEnd: () => { setTalking(false); setCaption(false); },
    });
  }, []);

  const confetti = async (big: boolean) => {
    const c = (await import("canvas-confetti")).default;
    c({ particleCount: big ? 220 : 120, spread: 90, origin: { y: 0.55 }, colors: ["#FF7DAA", "#8B6CFF", "#6FE0B0", "#FFD86B", "#8EC9FF"] });
    if (big) setTimeout(() => c({ particleCount: 120, spread: 120, origin: { x: 0.1, y: 0.7 } }), 300);
  };

  // ---------- start ----------
  const start = async () => {
    if (!quiz) return;
    if (!name.trim()) return setError(T.landing.needName);
    setError(null); setBusy(true);
    audio.unlock(); // unlock audio on the first tap
    audio.sfx("tap");
    audio.preload(quiz.clips.map(toClipInfo), quiz.use_creator_voice); // preload ALL clips now
    stickerUrls.forEach((u) => { const im = new Image(); im.src = u; }); // …and the sticker photos
    try {
      const p = await joinQuiz(slug, name.trim(), avatar);
      savePlay(slug, { participant_id: p.id, name: name.trim(), avatar, finished: false });
      setPid(p.id); setIdx(0); setPicked(null); setFb(null); setMood("idle"); setPhase("playing");
    } catch { setError(T.errorGeneric); }
    setBusy(false);
  };

  // ---------- answer ----------
  const answer = async (i: number) => {
    if (!quiz || !pid || picked !== null || busy) return;
    const q = quiz.questions[idx];
    setPicked(i); setBusy(true); audio.sfx("tap");
    try {
      const r = await submitAnswer(pid, q.id, i);
      setFb({ ok: r.is_correct, correct: r.correct_index });
      setMoodKey((k) => k + 1);
      if (r.is_correct) { setMood("happy"); audio.sfx("correct"); react("correct"); }
      else { setMood("wrong"); try { navigator.vibrate?.([120, 60, 160]); } catch {} audio.sfx("wrong"); react("wrong", q.id); setBurst((b) => b + 1); }
    } catch { setPicked(null); setError(T.errorGeneric); }
    setBusy(false);
  };

  // ---------- next / finish ----------
  const finish = async () => {
    if (!pid || !quiz) return;
    setPhase("drumroll"); setMood("listening"); audio.sfx("drumroll");
    try {
      const [r] = await Promise.all([finishQuiz(pid), sleep(2300)]);
      if (!alive.current) return;
      setResult(r);
      savePlay(slug, { participant_id: pid, name, avatar, finished: true, ...r });
      const pct = r.total ? (r.score / r.total) * 100 : 0;
      const high = pct >= 50;
      setPhase("result"); setMood(high ? "dance" : "wrong"); setMoodKey((k) => k + 1);
      if (high) { audio.sfx("fanfare"); confetti(pct === 100); }
      react(high ? "result_high" : "result_low");
    } catch { setError(T.errorGeneric); setPhase("playing"); }
  };

  const next = () => {
    audio.sfx("whoosh"); audio.stopVoice(); setTalking(false); setCaption(false);
    if (!quiz) return;
    if (idx + 1 < quiz.questions.length) { setIdx(idx + 1); setPicked(null); setFb(null); setMood("idle"); setError(null); }
    else finish();
  };

  const retry = () => { clearPlay(slug); setPrev(null); setResult(null); setPid(null); setMood("idle"); setPhase("landing"); };

  // ---------- render ----------
  if (phase === "loading") return <Screen><div className="flex flex-col items-center pt-16"><Mascot size={140} /><p className="mt-4 font-bold">{T.loading}</p></div></Screen>;
  if (phase === "missing" || !quiz)
    return <Screen><div className="flex flex-col items-center gap-5 pt-10 text-center"><Mascot mood="wrong" size={140} /><p className="font-title text-2xl font-bold">{T.notFound}</p><BigButton href="/" color="grape">{T.backHome}</BigButton></div></Screen>;

  const total = quiz.questions.length;
  const q = quiz.questions[idx];

  return (
    <Screen>
      <AnimatePresence mode="wait">
        {phase === "landing" && (
          <motion.div key="landing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5 text-center">
            <h1 className="title-pop text-4xl leading-tight">{T.landing.challenge(quiz.creator_name)}</h1>
            <PetSays kind="puppy" mood="happy" lines={PET_LINES.landing} size={130} className="w-full" />
            <p className="text-ink/70">{quiz.title} — {T.landing.sub}</p>

            {prev?.finished ? (
              <div className="card space-y-3">
                <p className="font-title text-xl font-bold">{T.landing.alreadyPlayed(prev.score ?? 0, prev.total ?? total)}</p>
                <BigButton href={`/q/${slug}/leaderboard`} color="sky">{T.landing.seeResult} 🏆</BigButton>
                <BigButton color="ghost" onClick={retry}>{T.landing.tryAgain}</BigButton>
              </div>
            ) : (
              <div className="card space-y-4 text-right">
                <label className="block"><span className="mb-1 block font-bold">{T.landing.yourName}</span>
                  <input className="input" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} placeholder={T.landing.yourNamePh} /></label>
                <div>
                  <span className="mb-2 block font-bold">{T.landing.pickAvatar}</span>
                  <div className="grid grid-cols-8 gap-1.5">
                    {T.avatars.map((a) => (
                      <motion.button key={a} whileTap={{ scale: 0.8 }} onClick={() => setAvatar(a)} aria-label={a}
                        className={`aspect-square rounded-xl text-2xl ${avatar === a ? "bg-grape/20 ring-4 ring-grape" : "bg-lav"}`}>{a}</motion.button>
                    ))}
                  </div>
                </div>
                <BigButton color="pink" onClick={start} disabled={busy}>{T.landing.start} 🎯</BigButton>
              </div>
            )}
          </motion.div>
        )}

        {phase === "playing" && (
          <motion.div key={"q" + idx} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.25 }} className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm font-bold"><span>{T.play.question(idx + 1, total)}</span><span>{avatar} {name}</span></div>
              <div className="h-4 overflow-hidden rounded-full bg-white shadow-inner">
                <motion.div className="h-full rounded-full bg-gradient-to-l from-pink to-grape" initial={false}
                  animate={{ width: `${((idx + (fb ? 1 : 0)) / total) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} />
              </div>
            </div>

            <div className="flex flex-col items-center">
              <Mascot key={moodKey} mood={mood} talking={talking} size={120} />
              <div className="h-7 text-sm font-bold text-grape">{caption && T.voice.caption(quiz.creator_name)}</div>
            </div>

            <div className="card text-center font-title text-2xl font-bold leading-snug">{q.text}</div>

            <div className="space-y-3">
              {q.options.map((o, i) => {
                const reveal = fb !== null;
                const isCorrect = reveal && fb!.correct === i;
                const isWrongPick = reveal && picked === i && !fb!.ok;
                const cls = isCorrect ? "bg-mint text-white ring-4 ring-mint/40 shadow-[0_5px_0_#27A272]" : isWrongPick ? "bg-[#FF6B8B] text-white shadow-[0_5px_0_#D9456A]" : reveal ? "bg-white/60 text-ink/40" : "bg-white text-ink shadow-[0_5px_0_rgba(59,42,92,.15)]";
                return (
                  <motion.button key={i} onClick={() => answer(i)} disabled={picked !== null}
                    whileTap={picked === null ? { scale: 0.96 } : undefined}
                    animate={isWrongPick ? { x: [0, -8, 8, -8, 0] } : isCorrect ? { scale: [1, 1.04, 1] } : {}}
                    className={`flex w-full items-center justify-between gap-3 rounded-[22px] px-5 py-4 text-right font-title text-xl font-bold transition-colors ${cls}`}>
                    <span>{o}</span>
                    {isCorrect && <span>✅</span>}{isWrongPick && <span>❌</span>}
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {fb && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className={`rounded-2xl p-3 text-center font-bold ${fb.ok ? "bg-mint/30" : "bg-pink/25"}`}>
                    {fb.ok ? T.play.right : <>{T.play.wrong} {T.play.correctRevealed} <b>{q.options[fb.correct]}</b></>}
                  </div>
                  <BigButton color="grape" onClick={next}>{idx + 1 < total ? T.play.next : T.play.finish} </BigButton>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {phase === "drumroll" && (
          <motion.div key="drum" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 pt-16 text-center">
            <Mascot mood="listening" size={190} />
            <motion.p animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.5 }} className="font-title text-3xl font-bold">{T.result.drumroll} 🥁</motion.p>
          </motion.div>
        )}

        {phase === "result" && result && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center">
            <div className="flex justify-center"><Mascot key={moodKey} mood={mood} talking={talking} size={170} /></div>
            <div className="h-6 text-sm font-bold text-grape">{caption && T.voice.caption(quiz.creator_name)}</div>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="mx-auto flex h-40 w-40 flex-col items-center justify-center rounded-full bg-white shadow-soft ring-8 ring-sun">
              <span className="font-title text-5xl font-extrabold text-grape">{T.result.score(result.score, result.total)}</span>
            </motion.div>
            <p className="mx-auto max-w-xs font-title text-2xl font-bold leading-snug">{T.result.message(result.total ? (result.score / result.total) * 100 : 0)}</p>
            <div className="mx-auto inline-block rounded-full bg-white px-5 py-2 text-lg font-bold shadow-soft">{avatar} {T.result.rank(result.rank)}</div>
            {(() => {
              const high = result.total ? (result.score / result.total) * 100 >= 50 : false;
              return <PetSays kind={high ? "puppy" : "kitten"} mood={high ? "happy" : "sad"} lines={high ? PET_LINES.result_high : PET_LINES.result_low} size={115} className="w-full" />;
            })()}
            <div className="space-y-3 pt-2">
              <BigButton href={`/q/${slug}/leaderboard`} color="sky">{T.result.leaderboard}</BigButton>
              <BigButton href="/create" color="pink">{T.result.makeYours}</BigButton>
              <BigButton color="ghost" onClick={retry}>{T.landing.tryAgain}</BigButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <StickerBurst trigger={burst} images={stickerUrls} />
      {error && <p role="alert" className="mt-4 rounded-2xl bg-pink/25 p-3 text-center font-bold">{error}</p>}
      <Link href="/" className="sr-only">{T.backHome}</Link>
    </Screen>
  );
}
