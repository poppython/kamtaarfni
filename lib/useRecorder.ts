"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RecResult } from "./types";

export const MAX_MS = 5000;
export const MIN_MS = 500;

export type RecState = "idle" | "recording";
export type RecError = "denied" | "unsupported" | "short" | null;

/** Chrome/Android → audio/webm;codecs=opus, Safari/iOS → audio/mp4. */
export function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}
export const baseMime = (m: string) => (m.includes("mp4") ? "audio/mp4" : "audio/webm");

export function useRecorder(onDone: (r: RecResult) => void) {
  const [state, setState] = useState<RecState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<RecError>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const cbRef = useRef(onDone);
  cbRef.current = onDone;

  const cleanup = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setAnalyser(null);
  }, []);

  useEffect(() => () => { try { recRef.current?.state === "recording" && recRef.current.stop(); } catch {} cleanup(); }, [cleanup]);

  const stop = useCallback(() => {
    const r = recRef.current;
    if (r && r.state === "recording") r.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const mime = pickMime();
    if (!mime || !navigator.mediaDevices?.getUserMedia) { setError("unsupported"); return; }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch { setError("denied"); return; }
    streamRef.current = stream;

    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AC();
      ctxRef.current = ctx;
      const an = ctx.createAnalyser();
      an.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(an);
      setAnalyser(an);
    } catch { /* waveform is optional */ }

    const rec = new MediaRecorder(stream, { mimeType: mime });
    recRef.current = rec;
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const durationMs = Date.now() - startRef.current;
      cleanup();
      setState("idle");
      setElapsed(0);
      if (durationMs < MIN_MS) { setError("short"); return; }
      const type = baseMime(mime);
      const blob = new Blob(chunksRef.current, { type });
      onDoneSafe(blob, type, Math.min(durationMs, MAX_MS));
    };
    const onDoneSafe = (blob: Blob, type: string, durationMs: number) =>
      cbRef.current({ blob, mime: type, durationMs, url: URL.createObjectURL(blob) });

    startRef.current = Date.now();
    rec.start();
    setState("recording");
    timerRef.current = window.setInterval(() => {
      const ms = Date.now() - startRef.current;
      setElapsed(Math.min(ms, MAX_MS));
      if (ms >= MAX_MS) stop();
    }, 50);
  }, [cleanup, stop]);

  return { state, elapsed, error, analyser, start, stop };
}
