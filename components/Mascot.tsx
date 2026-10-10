"use client";
import { motion } from "framer-motion";

export type Mood = "idle" | "happy" | "wrong" | "dance" | "listening";

const HEART = "M0 -3 C -7 -13 -21 -3 0 14 C 21 -3 7 -13 0 -3 Z";

function Eye({ mood, x }: { mood: Mood; x: number }) {
  if (mood === "happy")
    return (
      <motion.path d={HEART} fill="#FF3D7F" transform={`translate(${x} 92)`}
        animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 0.7 }} style={{ transformOrigin: `${x}px 92px` }} />
    );
  if (mood === "dance")
    return <path d={`M${x - 10} 94 Q${x} 80 ${x + 10} 94`} stroke="#3B2A5C" strokeWidth="5" strokeLinecap="round" fill="none" />;
  if (mood === "wrong")
    return (
      <g>
        <circle cx={x} cy="92" r="15" fill="#fff" stroke="#3B2A5C" strokeWidth="3" />
        <circle cx={x} cy="92" r="4.5" fill="#3B2A5C" />
      </g>
    );
  return (
    <motion.g animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ repeat: Infinity, duration: 4, times: [0, 0.9, 0.94, 0.98, 1] }}
      style={{ transformOrigin: `${x}px 94px` }}>
      <ellipse cx={x} cy="94" rx="8" ry="10.5" fill="#3B2A5C" />
      <circle cx={x + 2.5} cy="90" r="3" fill="#fff" />
    </motion.g>
  );
}

export default function Mascot({ mood = "idle", talking = false, size = 180 }: { mood?: Mood; talking?: boolean; size?: number }) {
  const body = {
    idle: { y: [0, -6, 0], transition: { repeat: Infinity, duration: 2.6, ease: "easeInOut" as const } },
    listening: { scale: [1, 1.04, 1], transition: { repeat: Infinity, duration: 1.1 } },
    happy: { y: [0, -26, 0, -14, 0], transition: { duration: 0.9 } },
    wrong: { x: [0, -10, 10, -10, 10, -5, 0], transition: { duration: 0.6 } },
    dance: { rotate: [-8, 8, -8], y: [0, -14, 0], transition: { repeat: Infinity, duration: 0.7 } },
  }[mood];
  const earScale = mood === "listening" ? 1.45 : 1;

  return (
    <motion.div style={{ width: size, height: size }} animate={body} aria-hidden>
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        {/* ears */}
        <motion.g animate={{ scale: earScale }} style={{ transformOrigin: "100px 80px" }} transition={{ type: "spring", stiffness: 200 }}>
          <path d="M42 80 L48 24 Q50 18 56 22 L92 52 Z" fill="#FFB3CC" />
          <path d="M158 80 L152 24 Q150 18 144 22 L108 52 Z" fill="#FFB3CC" />
          <path d="M54 66 L56 38 L78 54 Z" fill="#FF7DAA" />
          <path d="M146 66 L144 38 L122 54 Z" fill="#FF7DAA" />
        </motion.g>
        {/* body blob */}
        <path d="M100 38 C150 38 176 76 172 120 C168 162 138 184 100 184 C62 184 32 162 28 120 C24 76 50 38 100 38 Z" fill="#FFC8DC" />
        <ellipse cx="100" cy="150" rx="40" ry="26" fill="#FFE3EE" />
        {/* cheeks */}
        <ellipse cx="55" cy="118" rx="13" ry="8" fill="#FF8FB8" opacity=".55" />
        <ellipse cx="145" cy="118" rx="13" ry="8" fill="#FF8FB8" opacity=".55" />
        {/* eyes */}
        <Eye mood={mood} x={70} />
        <Eye mood={mood} x={130} />
        {/* nose */}
        <path d="M94 110 Q100 106 106 110 Q100 118 94 110 Z" fill="#FF5C93" />
        {/* mouth */}
        {talking ? (
          <motion.ellipse cx="100" cy="128" rx="9" ry={3} fill="#C2406F" animate={{ ry: [3, 10, 4, 9, 3] }} transition={{ repeat: Infinity, duration: 0.45 }} />
        ) : mood === "happy" || mood === "dance" ? (
          <path d="M86 124 Q100 144 114 124 Z" fill="#C2406F" />
        ) : mood === "wrong" ? (
          <ellipse cx="100" cy="130" rx="6" ry="8" fill="#C2406F" />
        ) : (
          <path d="M90 124 Q95 132 100 124 Q105 132 110 124" stroke="#3B2A5C" strokeWidth="3" strokeLinecap="round" fill="none" />
        )}
        {/* whiskers */}
        <g stroke="#3B2A5C" strokeWidth="2.5" strokeLinecap="round" opacity=".5">
          <path d="M34 112 L14 106" /><path d="M34 122 L12 124" />
          <path d="M166 112 L186 106" /><path d="M166 122 L188 124" />
        </g>
        {/* little feet */}
        <ellipse cx="68" cy="184" rx="16" ry="8" fill="#FFB3CC" />
        <ellipse cx="132" cy="184" rx="16" ry="8" fill="#FFB3CC" />
      </svg>
    </motion.div>
  );
}
