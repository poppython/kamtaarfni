"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Pet, { PetKind, PetMood } from "./Pet";
import { audio } from "@/lib/audio";

/** A cartoon pet with a speech bubble. Lines rotate; tap the pet to hear it speak Arabic. */
export default function PetSays({ kind = "puppy", variant = "a", lines, mood = "idle", size = 120, className = "" }: {
  kind?: PetKind; variant?: "a" | "b"; lines: string[]; mood?: PetMood; size?: number; className?: string;
}) {
  const [i, setI] = useState(0);
  const [talking, setTalking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setI(0); }, [lines]);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % lines.length), 4300);
    return () => clearInterval(t);
  }, [lines]);
  // mouth moves for a moment each time a new line appears
  useEffect(() => {
    setTalking(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTalking(false), 1500);
    return () => clearTimeout(timer.current);
  }, [i]);

  const speak = () => {
    audio.unlock();
    audio.say(lines[i], () => setTalking(true), () => setTalking(false));
  };

  return (
    <div className={`flex items-end gap-1 ${className}`}>
      <Pet kind={kind} variant={variant} mood={mood} talking={talking} size={size} onClick={speak} label="🔊" />
      <div className="relative mb-6 min-h-[64px] flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, scale: 0.85, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }} className="bubble bubble-r font-title text-lg font-bold leading-snug">
            {lines[i]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
