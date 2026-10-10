"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Mascot, { Mood } from "@/components/Mascot";
import BigButton from "@/components/BigButton";
import Screen from "@/components/Screen";
import VoiceSlot from "@/components/VoiceSlot";
import StickerPicker from "@/components/StickerPicker";
import { T } from "@/lib/phrases";
import { audio } from "@/lib/audio";
import { createQuiz, uploadClip, uploadSticker } from "@/lib/api";
import { saveMyQuiz } from "@/lib/local";
import type { ClipInfo, RecResult, StickerDraft, VoiceKind } from "@/lib/types";

type VDraft = RecResult & { id: string };
type QDraft = { uid: string; text: string; options: string[]; correct: number | null; voice: VDraft | null; voiceOpen: boolean };
const KINDS: VoiceKind[] = ["wrong", "correct", "result_low", "result_high"];
const uid = () => Math.random().toString(36).slice(2, 10);
const newQ = (): QDraft => ({ uid: uid(), text: "", options: ["", ""], correct: null, voice: null, voiceOpen: false });

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [voices, setVoices] = useState<Record<VoiceKind, VDraft[]>>({ wrong: [], correct: [], result_low: [], result_high: [] });
  const [qs, setQs] = useState<QDraft[]>([newQ()]);
  const [stickers, setStickers] = useState<(StickerDraft & { id: string })[]>([]);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [talking, setTalking] = useState(false);
  const [testCaption, setTestCaption] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const go = (n: number) => { setError(null); setStep(n); topRef.current?.scrollIntoView({ behavior: "smooth" }); };

  // ---- step validation ----
  const toVoice = () => {
    if (!name.trim() || !title.trim()) return setError(T.create.errNeedName);
    go(1);
  };
  const toPublish = () => {
    if (qs.length < 1) return setError(T.create.errNeedQuestions);
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      if (!q.text.trim() || q.options.some((o) => !o.trim()) || q.correct === null) return setError(T.create.errQuestionIncomplete(i + 1));
    }
    go(4);
  };

  // ---- questions helpers ----
  const patchQ = (id: string, p: Partial<QDraft>) => setQs((l) => l.map((q) => (q.uid === id ? { ...q, ...p } : q)));
  const move = (i: number, d: -1 | 1) => setQs((l) => {
    const j = i + d; if (j < 0 || j >= l.length) return l;
    const c = [...l]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });
  const removeOption = (q: QDraft, oi: number) => {
    const options = q.options.filter((_, i) => i !== oi);
    let correct = q.correct;
    if (correct !== null) correct = correct === oi ? null : correct > oi ? correct - 1 : correct;
    patchQ(q.uid, { options, correct });
  };

  // ---- voice helpers ----
  const addVoice = (kind: VoiceKind, r: RecResult) => setVoices((v) => ({ ...v, [kind]: [...v[kind], { ...r, id: uid() }] }));
  const delVoice = (kind: VoiceKind, id: string) => setVoices((v) => ({ ...v, [kind]: v[kind].filter((x) => x.id !== id) }));

  const testWrong = () => {
    audio.unlock();
    const clips: ClipInfo[] = KINDS.flatMap((k) => voices[k].map((d) => ({ id: d.id, kind: k, question_id: null, url: d.url, mime_type: d.mime })));
    audio.preload(clips, true);
    audio.sfx("wrong");
    audio.playVoice("wrong", { onStart: (s) => { setTalking(true); setTestCaption(s === "creator"); }, onEnd: () => { setTalking(false); setTestCaption(false); } });
  };

  // ---- publish ----
  const publish = async () => {
    setBusy(true); setError(null); setProgress(T.create.publishing);
    try {
      const res = await createQuiz(title, name, qs.map((q) => ({ text: q.text.trim(), options: q.options.map((o) => o.trim()), correct_index: q.correct as number })));
      saveMyQuiz({ slug: res.slug, quiz_id: res.id, title: title.trim(), creator_name: name.trim(), token: res.creator_token, created_at: Date.now() });

      const jobs: { kind: VoiceKind; questionId: string | null; d: VDraft }[] = [];
      KINDS.forEach((k) => voices[k].forEach((d) => jobs.push({ kind: k, questionId: null, d })));
      qs.forEach((q, i) => { if (q.voice) jobs.push({ kind: "wrong", questionId: res.question_ids[i], d: q.voice }); });

      let failed = 0;
      for (const j of jobs) {
        setProgress(T.create.uploadingVoices);
        try {
          await uploadClip({ quizId: res.id, token: res.creator_token, kind: j.kind, questionId: j.questionId, blob: j.d.blob, mime: j.d.mime, durationMs: j.d.durationMs });
        } catch { failed++; } // never block publishing
      }
      for (const s of stickers) {
        setProgress(T.create.uploadingVoices);
        try { await uploadSticker({ quizId: res.id, token: res.creator_token, blob: s.blob, mime: s.mime }); } catch { failed++; }
      }
      router.push(`/share/${res.slug}${failed ? "?voicefail=1" : ""}`);
    } catch {
      setError(T.errorGeneric); setBusy(false);
    }
  };

  const totalClips = KINDS.reduce((n, k) => n + voices[k].length, 0) + qs.filter((q) => q.voice).length;
  const mood: Mood = step === 1 && recording ? "listening" : "idle";

  return (
    <Screen>
      <div ref={topRef} />
      {/* progress dots */}
      <div className="mb-4 flex items-center justify-center gap-2">
        {T.create.stepLabels.map((l, i) => (
          <div key={l} className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${i === step ? "bg-grape text-white" : i < step ? "bg-mint/70" : "bg-white/80 text-ink/50"}`}>{l}</div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.2 }}>
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex justify-center"><Mascot size={130} /></div>
              <h1 className="title-pop text-center text-3xl">{T.create.detailsHeading}</h1>
              <div className="card space-y-4">
                <label className="block"><span className="mb-1 block font-bold">{T.create.yourName}</span>
                  <input className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder={T.create.yourNamePh} /></label>
                <label className="block"><span className="mb-1 block font-bold">{T.create.quizTitle}</span>
                  <input className="input" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={T.create.quizTitlePh} /></label>
              </div>
              <BigButton color="grape" onClick={toVoice}>{T.create.next}</BigButton>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex justify-center"><Mascot mood={mood} talking={talking} size={130} /></div>
              <h1 className="title-pop text-center text-3xl">{T.voice.heading}</h1>
              <p className="text-center text-ink/70">{T.voice.intro}</p>
              {T.voice.slots.map((s) => (
                <VoiceSlot key={s.kind} title={s.title} hints={s.hints} max={3} items={voices[s.kind].map((d) => ({ id: d.id, url: d.url, durationMs: d.durationMs }))}
                  onAdd={(r) => addVoice(s.kind, r)} onDelete={(id) => delVoice(s.kind, id)} onRecordingChange={setRecording} disabled={recording} />
              ))}
              <BigButton color="sun" onClick={testWrong}>{T.voice.testButton}</BigButton>
              {testCaption && <p className="text-center font-bold text-grape">{T.voice.caption(name || "…")}</p>}
              <p className="text-center text-sm text-ink/60">{T.voice.skipNote}</p>
              <div className="flex gap-3">
                <BigButton color="ghost" onClick={() => go(0)} full={false} className="flex-1">{T.create.back}</BigButton>
                <BigButton color="grape" onClick={() => go(2)} full={false} className="flex-[2]">{totalClips ? T.create.next : T.create.skip}</BigButton>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-center"><Mascot mood="happy" size={130} /></div>
              <h1 className="title-pop text-center text-3xl">{T.stickers.heading}</h1>
              <StickerPicker items={stickers.map((s) => ({ id: s.id, url: s.url }))}
                onAdd={(s) => setStickers((l) => [...l, { ...s, id: uid() }])} onDelete={(id) => setStickers((l) => l.filter((x) => x.id !== id))} />
              <div className="flex gap-3">
                <BigButton color="ghost" onClick={() => go(1)} full={false} className="flex-1">{T.create.back}</BigButton>
                <BigButton color="grape" onClick={() => go(3)} full={false} className="flex-[2]">{stickers.length ? T.create.next : T.create.skip}</BigButton>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h1 className="title-pop text-center text-3xl">{T.create.questionsHeading}</h1>
              <p className="text-center text-ink/70">{T.create.questionsHint}</p>
              <p className="text-center text-sm font-bold text-grape">{T.create.tapCorrect}</p>

              {qs.map((q, qi) => (
                <motion.div layout key={q.uid} className="card space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-grape font-bold text-white">{qi + 1}</span>
                    <input className="input" value={q.text} maxLength={200} onChange={(e) => patchQ(q.uid, { text: e.target.value })} placeholder={T.create.questionPh} />
                  </div>
                  {q.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button aria-label="correct" onClick={() => patchQ(q.uid, { correct: oi })}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 text-lg transition-colors ${q.correct === oi ? "border-mint bg-mint text-white" : "border-lav bg-white text-transparent"}`}>✓</button>
                      <input className="input !py-2 !text-base" value={o} maxLength={80} placeholder={`${T.create.optionPh} ${oi + 1}`}
                        onChange={(e) => patchQ(q.uid, { options: q.options.map((x, i) => (i === oi ? e.target.value : x)) })} />
                      {q.options.length > 2 && <button aria-label={T.create.remove} className="text-xl" onClick={() => removeOption(q, oi)}>✖️</button>}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2 text-sm font-bold">
                    {q.options.length < 4 && <button className="rounded-xl bg-sky/50 px-3 py-2" onClick={() => patchQ(q.uid, { options: [...q.options, ""] })}>{T.create.addOption}</button>}
                    <button className={`rounded-xl px-3 py-2 ${q.voice ? "bg-pink/40" : "bg-sun/60"}`} onClick={() => patchQ(q.uid, { voiceOpen: !q.voiceOpen })}>{T.voice.perQuestion}{q.voice ? " ✓" : ""}</button>
                    <span className="mr-auto" />
                    <button disabled={qi === 0} className="rounded-xl bg-lav px-3 py-2 disabled:opacity-30" onClick={() => move(qi, -1)}>⬆️</button>
                    <button disabled={qi === qs.length - 1} className="rounded-xl bg-lav px-3 py-2 disabled:opacity-30" onClick={() => move(qi, 1)}>⬇️</button>
                    <button className="rounded-xl bg-pink/30 px-3 py-2" onClick={() => setQs((l) => l.filter((x) => x.uid !== q.uid))}>🗑</button>
                  </div>
                  {q.voiceOpen && (
                    <VoiceSlot title={T.voice.perQuestionTitle} max={1} items={q.voice ? [{ id: q.voice.id, url: q.voice.url, durationMs: q.voice.durationMs }] : []}
                      onAdd={(r) => patchQ(q.uid, { voice: { ...r, id: uid() } })} onDelete={() => patchQ(q.uid, { voice: null })} />
                  )}
                </motion.div>
              ))}

              {qs.length < 30 ? <BigButton color="sky" onClick={() => setQs((l) => [...l, newQ()])}>{T.create.addQuestion}</BigButton>
                : <p className="text-center font-bold">{T.create.maxQuestions}</p>}
              <div className="flex gap-3">
                <BigButton color="ghost" onClick={() => go(2)} full={false} className="flex-1">{T.create.back}</BigButton>
                <BigButton color="grape" onClick={toPublish} full={false} className="flex-[2]">{T.create.next}</BigButton>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 text-center">
              <div className="flex justify-center"><Mascot mood="happy" size={150} /></div>
              <h1 className="font-title text-3xl font-bold">{T.create.publishHeading}</h1>
              <div className="card">
                <div className="font-title text-2xl font-bold">{title}</div>
                <div className="mt-1 text-ink/70">{T.create.publishSummary(qs.length, totalClips, stickers.length)}</div>
              </div>
              {progress && busy && <p className="font-bold text-grape">{progress}</p>}
              <BigButton color="pink" onClick={publish} disabled={busy}>{busy ? T.create.publishing : `${T.create.publish} 🚀`}</BigButton>
              {!busy && <BigButton color="ghost" onClick={() => go(3)}>{T.create.back}</BigButton>}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {error && <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} role="alert" className="mt-4 rounded-2xl bg-pink/25 p-3 text-center font-bold">{error}</motion.p>}
    </Screen>
  );
}
