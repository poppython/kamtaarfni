"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { T } from "@/lib/phrases";
import { MAX_MS, useRecorder } from "@/lib/useRecorder";
import type { RecResult } from "@/lib/types";
import Waveform from "./Waveform";

export interface VItem { id: string; url: string; durationMs: number }

interface Props {
  title: string;
  hints?: string[];
  items: VItem[];
  max: number;
  onAdd: (r: RecResult) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onRecordingChange?: (recording: boolean) => void;
  /** An id (e.g. other slot) currently recording → this slot disables its mic */
  disabled?: boolean;
}

export default function VoiceSlot({ title, hints, items, max, onAdd, onDelete, onRecordingChange, disabled }: Props) {
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  const rec = useRecorder(async (r) => {
    setWorking(true);
    try { await onAdd(r); } catch { setNote(T.errorGeneric); } finally { setWorking(false); }
  });

  useEffect(() => { onRecordingChange?.(rec.state === "recording"); }, [rec.state]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const errMsg = rec.error === "denied" ? T.voice.micDenied : rec.error === "unsupported" ? T.voice.micUnsupported : rec.error === "short" ? T.voice.tooShort : note;
  const full = items.length >= max;
  const recording = rec.state === "recording";
  const R = 34, C = 2 * Math.PI * R;

  const play = (it: VItem) => {
    audioRef.current?.pause();
    const a = new Audio(it.url);
    audioRef.current = a;
    setPlaying(it.id);
    a.onended = () => setPlaying(null);
    a.play().catch(() => setPlaying(null));
  };

  return (
    <div className="rounded-3xl bg-lav/70 p-4">
      <div className="font-title text-lg font-bold">{title}</div>
      {hints && (
        <div className="mt-2 flex flex-wrap gap-2">
          {hints.map((h) => <span key={h} className="rounded-full bg-white px-3 py-1 text-sm text-ink/80">«{h}»</span>)}
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {items.map((it, i) => (
          <li key={it.id} className="flex items-center gap-2 rounded-2xl bg-white p-2 pr-3">
            <span className="text-sm font-bold">#{i + 1}</span>
            <span className="text-sm text-ink/60">{(it.durationMs / 1000).toFixed(1)}s</span>
            <button className="mr-auto rounded-xl bg-mint/70 px-3 py-2 text-sm font-bold active:scale-95" onClick={() => play(it)}>
              {playing === it.id ? "🔊" : "▶️"} {T.voice.preview}
            </button>
            <button className="rounded-xl bg-pink/20 px-3 py-2 text-sm font-bold active:scale-95" onClick={() => onDelete(it.id)}>🗑 {T.voice.delete}</button>
          </li>
        ))}
      </ul>

      {!full ? (
        <div className="mt-3 flex flex-col items-center gap-2">
          {recording && <Waveform analyser={rec.analyser} />}
          <div className="relative h-20 w-20">
            {recording && (
              <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
                <circle cx="40" cy="40" r={R} fill="none" stroke="#fff" strokeWidth="6" />
                <circle cx="40" cy="40" r={R} fill="none" stroke="#FF3D5A" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - rec.elapsed / MAX_MS)} />
              </svg>
            )}
            <motion.button
              onClick={() => (recording ? rec.stop() : rec.start())}
              disabled={disabled || working}
              whileTap={{ scale: 0.9 }}
              animate={recording ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={recording ? { repeat: Infinity, duration: 0.8 } : undefined}
              className={`absolute inset-2 flex items-center justify-center rounded-full text-3xl text-white shadow-soft disabled:opacity-40 ${recording ? "bg-[#FF3D5A]" : "bg-pink"}`}
              aria-label={recording ? T.voice.stop : T.voice.record}
            >
              {recording ? "⏹" : "🎤"}
            </motion.button>
          </div>
          <div className="text-sm text-ink/70">
            {working ? T.loading : recording ? `${T.voice.recording} ${(rec.elapsed / 1000).toFixed(1)}s` : `${T.voice.record} (${T.voice.maxLen})`}
          </div>
        </div>
      ) : (
        <div className="mt-2 text-center text-sm text-ink/60">{T.voice.slotFull}</div>
      )}
      {errMsg && <p className="mt-2 rounded-2xl bg-sun/40 p-3 text-center text-sm">{errMsg}</p>}
    </div>
  );
}
