"use client";
import { motion } from "framer-motion";

export type PetKind = "puppy" | "kitten";
export type PetMood = "idle" | "happy" | "sad";

const PUPPY = {
  a: { fur: "#FFF3E0", patch: "#D9A066", ear: "#C98A4B" },
  b: { fur: "#F1E2CC", patch: "#8B5E3C", ear: "#7A4E2E" },
};
const KITTEN = {
  a: { fur: "#FFB067", stripe: "#E8863A", muzzle: "#FFF1DC", inner: "#FF8FB8" },
  b: { fur: "#C9CEDB", stripe: "#9AA1B5", muzzle: "#F4F6FB", inner: "#FFB3CC" },
};

function Mouth({ talking, mood, y = 128 }: { talking: boolean; mood: PetMood; y?: number }) {
  if (talking)
    return (
      <g>
        <motion.ellipse cx="100" cy={y + 2} rx="10" ry={4} fill="#B83A64" animate={{ ry: [4, 11, 5, 10, 4] }} transition={{ repeat: Infinity, duration: 0.42 }} />
        <motion.ellipse cx="100" cy={y + 9} rx="6" ry={3} fill="#FF7DAA" animate={{ ry: [2, 6, 3, 6, 2] }} transition={{ repeat: Infinity, duration: 0.42 }} />
      </g>
    );
  if (mood === "happy")
    return (
      <g>
        <path d={`M82 ${y - 2} Q100 ${y + 22} 118 ${y - 2} Z`} fill="#B83A64" />
        <ellipse cx="100" cy={y + 10} rx="9" ry="7" fill="#FF7DAA" />
      </g>
    );
  if (mood === "sad") return <path d={`M86 ${y + 8} Q100 ${y - 4} 114 ${y + 8}`} stroke="#3B2A5C" strokeWidth="3.5" strokeLinecap="round" fill="none" />;
  return <path d={`M88 ${y} Q94 ${y + 8} 100 ${y} Q106 ${y + 8} 112 ${y}`} stroke="#3B2A5C" strokeWidth="3.5" strokeLinecap="round" fill="none" />;
}

function Eyes({ mood, y = 92, dx = 28 }: { mood: PetMood; y?: number; dx?: number }) {
  const xs = [100 - dx, 100 + dx];
  if (mood === "happy")
    return <>{xs.map((x) => <path key={x} d={`M${x - 9} ${y + 3} Q${x} ${y - 11} ${x + 9} ${y + 3}`} stroke="#3B2A5C" strokeWidth="5" strokeLinecap="round" fill="none" />)}</>;
  return (
    <>
      {xs.map((x) => (
        <motion.g key={x} animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ repeat: Infinity, duration: 4.2, times: [0, 0.9, 0.94, 0.98, 1] }} style={{ transformOrigin: `${x}px ${y}px` }}>
          <ellipse cx={x} cy={y} rx="9" ry={mood === "sad" ? 11 : 10} fill="#3B2A5C" />
          <circle cx={x + 3} cy={y - 4} r="3.5" fill="#fff" />
          <circle cx={x - 3} cy={y + 4} r="1.6" fill="#fff" opacity=".8" />
        </motion.g>
      ))}
      {mood === "sad" && <>
        <path d={`M${xs[0] - 12} ${y - 17} L${xs[0] + 8} ${y - 12}`} stroke="#3B2A5C" strokeWidth="3.5" strokeLinecap="round" />
        <path d={`M${xs[1] + 12} ${y - 17} L${xs[1] - 8} ${y - 12}`} stroke="#3B2A5C" strokeWidth="3.5" strokeLinecap="round" />
        <motion.ellipse cx={xs[1] + 4} cy={y + 18} rx="3.5" ry="5" fill="#8EC9FF" animate={{ cy: [y + 14, y + 34], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} />
      </>}
    </>
  );
}

function Puppy({ mood, talking, v }: { mood: PetMood; talking: boolean; v: "a" | "b" }) {
  const c = PUPPY[v];
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      {/* floppy ears */}
      <motion.g animate={{ rotate: talking || mood === "happy" ? [0, -8, 0] : 0 }} transition={{ repeat: Infinity, duration: 0.5 }} style={{ transformOrigin: "52px 70px" }}>
        <ellipse cx="42" cy="100" rx="24" ry="42" fill={c.ear} transform="rotate(14 42 100)" />
      </motion.g>
      <motion.g animate={{ rotate: talking || mood === "happy" ? [0, 8, 0] : 0 }} transition={{ repeat: Infinity, duration: 0.5 }} style={{ transformOrigin: "148px 70px" }}>
        <ellipse cx="158" cy="100" rx="24" ry="42" fill={c.ear} transform="rotate(-14 158 100)" />
      </motion.g>
      {/* body + collar */}
      <ellipse cx="100" cy="172" rx="46" ry="28" fill={c.fur} />
      <ellipse cx="100" cy="150" rx="34" ry="8" fill="#FF7DAA" />
      <circle cx="100" cy="162" r="8" fill="#FFD86B" stroke="#E0B43A" strokeWidth="2" />
      <ellipse cx="66" cy="190" rx="14" ry="7" fill="#fff" /><ellipse cx="134" cy="190" rx="14" ry="7" fill="#fff" />
      {/* tail wag */}
      <motion.path d="M146 168 Q172 150 168 126" stroke={c.ear} strokeWidth="12" strokeLinecap="round" fill="none"
        animate={{ rotate: [-14, 14, -14] }} transition={{ repeat: Infinity, duration: mood === "happy" ? 0.35 : 0.9 }} style={{ transformOrigin: "146px 168px" }} />
      {/* head */}
      <ellipse cx="100" cy="98" rx="64" ry="56" fill={c.fur} />
      <ellipse cx="127" cy="84" rx="24" ry="26" fill={c.patch} opacity=".92" />
      <ellipse cx="100" cy="122" rx="32" ry="23" fill="#fff" />
      <ellipse cx="58" cy="116" rx="12" ry="7" fill="#FF8FB8" opacity=".5" /><ellipse cx="142" cy="116" rx="12" ry="7" fill="#FF8FB8" opacity=".5" />
      <Eyes mood={mood} y={90} dx={28} />
      <ellipse cx="100" cy="109" rx="12" ry="8.5" fill="#3B2A5C" /><ellipse cx="96" cy="106" rx="4" ry="2.4" fill="#fff" opacity=".7" />
      <path d="M100 117 L100 124" stroke="#3B2A5C" strokeWidth="3" strokeLinecap="round" />
      <Mouth talking={talking} mood={mood} y={126} />
    </svg>
  );
}

function Kitten({ mood, talking, v }: { mood: PetMood; talking: boolean; v: "a" | "b" }) {
  const c = KITTEN[v];
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      {/* tail */}
      <motion.path d="M142 172 Q184 170 176 128 Q174 116 164 122" stroke={c.fur} strokeWidth="15" strokeLinecap="round" fill="none"
        animate={{ rotate: [-8, 10, -8] }} transition={{ repeat: Infinity, duration: 1.6 }} style={{ transformOrigin: "142px 172px" }} />
      {/* ears */}
      <path d="M34 78 L40 22 Q42 14 50 20 L92 50 Z" fill={c.fur} /><path d="M166 78 L160 22 Q158 14 150 20 L108 50 Z" fill={c.fur} />
      <path d="M48 62 L50 36 L74 52 Z" fill={c.inner} /><path d="M152 62 L150 36 L126 52 Z" fill={c.inner} />
      {/* body */}
      <ellipse cx="100" cy="172" rx="44" ry="28" fill={c.fur} /><ellipse cx="100" cy="176" rx="26" ry="20" fill={c.muzzle} />
      <ellipse cx="68" cy="192" rx="15" ry="7" fill={c.muzzle} /><ellipse cx="132" cy="192" rx="15" ry="7" fill={c.muzzle} />
      <path d="M72 150 Q100 162 128 150" stroke="#8B6CFF" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M100 158 l-6 8 h12 z" fill="#FFD86B" />
      {/* head */}
      <ellipse cx="100" cy="102" rx="68" ry="56" fill={c.fur} />
      <g stroke={c.stripe} strokeWidth="6" strokeLinecap="round"><path d="M100 50 L100 66" /><path d="M80 54 L84 68" /><path d="M120 54 L116 68" /></g>
      <ellipse cx="100" cy="124" rx="30" ry="21" fill={c.muzzle} />
      <ellipse cx="55" cy="116" rx="12" ry="7" fill="#FF8FB8" opacity=".55" /><ellipse cx="145" cy="116" rx="12" ry="7" fill="#FF8FB8" opacity=".55" />
      <Eyes mood={mood} y={94} dx={30} />
      <path d="M93 110 Q100 105 107 110 Q100 120 93 110 Z" fill="#FF5C93" />
      <Mouth talking={talking} mood={mood} y={124} />
      <g stroke="#3B2A5C" strokeWidth="2.5" strokeLinecap="round" opacity=".45">
        <path d="M44 108 L16 100" /><path d="M44 120 L14 124" /><path d="M156 108 L184 100" /><path d="M156 120 L186 124" />
      </g>
    </svg>
  );
}

export default function Pet({ kind = "puppy", variant = "a", mood = "idle", talking = false, size = 120, onClick, label }: {
  kind?: PetKind; variant?: "a" | "b"; mood?: PetMood; talking?: boolean; size?: number; onClick?: () => void; label?: string;
}) {
  const anim = talking || mood === "happy"
    ? { y: [0, -10, 0], transition: { repeat: Infinity, duration: 0.55 } }
    : mood === "sad"
      ? { y: [0, 3, 0], transition: { repeat: Infinity, duration: 2.4 } }
      : { y: [0, -5, 0], transition: { repeat: Infinity, duration: 2.8, ease: "easeInOut" as const } };
  const body = kind === "puppy" ? <Puppy mood={mood} talking={talking} v={variant} /> : <Kitten mood={mood} talking={talking} v={variant} />;
  const Wrapper = onClick ? motion.button : motion.div;
  return (
    <Wrapper style={{ width: size, height: size }} animate={anim} onClick={onClick} whileTap={onClick ? { scale: 0.9 } : undefined}
      aria-label={onClick ? label : undefined} aria-hidden={onClick ? undefined : true} className="shrink-0">
      {body}
    </Wrapper>
  );
}
