"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Pet from "./Pet";
import Mascot from "./Mascot";
import { audio } from "@/lib/audio";

/** Hero for the home screen: puppy + blob-cat mascot + kitten, one speech bubble, they take turns talking. */
export default function PetTrio({ lines }: { lines: string[] }) {
  const [i, setI] = useState(0);
  const [talking, setTalking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const speaker = i % 3; // 0 puppy · 1 mascot · 2 kitten

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % lines.length), 4300);
    return () => clearInterval(t);
  }, [lines]);
  useEffect(() => {
    setTalking(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTalking(false), 1600);
    return () => clearTimeout(timer.current);
  }, [i]);

  const speak = (idx: number) => {
    audio.unlock();
    setI(idx % lines.length);
    audio.say(lines[idx % lines.length], () => setTalking(true), () => setTalking(false));
  };
  const align = speaker === 0 ? "justify-end" : speaker === 2 ? "justify-start" : "justify-center"; // RTL: first child sits on the right

  return (
    <div className="flex flex-col items-center">
      <div className={`flex w-full ${align} px-2`}>
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }} className="bubble bubble-down max-w-[260px] text-center font-title text-xl font-bold leading-snug">
            {lines[i]}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-3 flex items-end justify-center">
        <Pet kind="puppy" mood={speaker === 0 ? "happy" : "idle"} talking={talking && speaker === 0} size={112} onClick={() => speak(0)} label="🐶" />
        <div className="-mx-2 -mb-1"><Mascot mood={speaker === 1 ? "happy" : "idle"} talking={talking && speaker === 1} size={160} /></div>
        <Pet kind="kitten" mood={speaker === 2 ? "happy" : "idle"} talking={talking && speaker === 2} size={112} onClick={() => speak(2)} label="🐱" />
      </div>
    </div>
  );
}
