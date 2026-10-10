"use client";
import { audio, useMuted } from "@/lib/audio";
import { T } from "@/lib/phrases";

export default function MuteButton() {
  const muted = useMuted();
  return (
    <button
      onClick={() => { audio.unlock(); audio.setMuted(!muted); }}
      aria-label={muted ? T.unmute : T.mute}
      title={muted ? T.unmute : T.mute}
      className="fixed left-3 top-3 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-soft active:scale-90 transition-transform"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
