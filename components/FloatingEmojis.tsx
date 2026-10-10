"use client";
import { motion } from "framer-motion";
import { T } from "@/lib/phrases";

const SPOTS = [
  { l: "6%", t: "10%", s: 28, d: 5 }, { l: "86%", t: "16%", s: 24, d: 6 }, { l: "14%", t: "42%", s: 22, d: 7 },
  { l: "90%", t: "50%", s: 30, d: 5.5 }, { l: "8%", t: "78%", s: 26, d: 6.5 }, { l: "80%", t: "86%", s: 28, d: 4.8 },
  { l: "48%", t: "4%", s: 20, d: 7.5 }, { l: "52%", t: "94%", s: 22, d: 6.2 },
];

export default function FloatingEmojis() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden>
      {SPOTS.map((p, i) => (
        <motion.span key={i} className="absolute opacity-60 select-none" style={{ left: p.l, top: p.t, fontSize: p.s }}
          animate={{ y: [0, -18, 0], rotate: [-8, 8, -8] }} transition={{ repeat: Infinity, duration: p.d, ease: "easeInOut", delay: i * 0.3 }}>
          {T.floatingEmojis[i % T.floatingEmojis.length]}
        </motion.span>
      ))}
    </div>
  );
}
