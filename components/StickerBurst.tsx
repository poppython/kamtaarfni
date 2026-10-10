"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { audio } from "@/lib/audio";

const FALLBACK = ["😹", "🤦", "🙈", "😱", "💀", "🫣", "🤡", "🙃"];

interface Item {
  id: number; src: string | null; emoji: string;
  sx: number; sy: number; tx: number; ty: number; size: number; rot: number; delay: number;
}

export default function StickerBurst({ trigger, images, count = 4 }: { trigger: number; images: string[]; count?: number }) {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const list: Item[] = Array.from({ length: count }, (_, i) => {
      const size = 140 + Math.random() * 60; // Larger stickers: 140-200px
      const fromLeft = Math.random() < 0.5;
      return {
        id: i,
        src: images.length ? images[Math.floor(Math.random() * images.length)] : null,
        emoji: FALLBACK[Math.floor(Math.random() * FALLBACK.length)],
        sx: fromLeft ? -size : vw + size,
        sy: -size,
        tx: clamp(Math.random() * vw - size / 2, 16, Math.max(16, vw - size - 16)),
        ty: clamp(vh * (0.1 + Math.random() * 0.65), 40, Math.max(40, vh - size - 40)),
        size,
        rot: -30 + Math.random() * 60,
        delay: i * 0.12,
      };
    });
    setItems(list);
    audio.beep(count);
    const t = setTimeout(() => setItems([]), 4000);
    return () => clearTimeout(t);
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {items.map((it) => (
        <motion.div
          key={`${trigger}-${it.id}`}
          className="absolute left-0 top-0 flex items-center justify-center"
          style={{ width: it.size, height: it.size }}
          initial={{ x: it.sx, y: it.sy, scale: 0.2, rotate: it.sx < 0 ? -60 : 60, opacity: 1 }}
          animate={{
            x: it.tx, y: it.ty,
            scale: [0.2, 1.4, 1, 1.15, 1],
            rotate: it.rot,
            opacity: [1, 1, 0.2, 1, 0.2, 1, 0.2, 1, 0],
          }}
          transition={{
            x: { type: "spring", stiffness: 100, damping: 12, delay: it.delay },
            y: { type: "spring", stiffness: 100, damping: 12, delay: it.delay },
            rotate: { type: "spring", stiffness: 100, damping: 10, delay: it.delay },
            scale: { duration: 0.9, delay: it.delay },
            opacity: { duration: 3.2, delay: it.delay, times: [0, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.85, 1] },
          }}
        >
          {it.src ? (
            <img src={it.src} alt="" draggable={false}
              className="h-full w-full drop-shadow-[0_0_0_6px_#fff,0_8px_24px_rgba(59,42,92,.4)]" />
          ) : (
            <span className="select-none drop-shadow-lg" style={{ fontSize: it.size * 0.7 }}>{it.emoji}</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}