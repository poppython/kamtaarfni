"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ReactNode } from "react";
import { audio } from "@/lib/audio";

type Color = "pink" | "mint" | "sky" | "sun" | "grape" | "ghost";
const MLink = motion(Link);

interface Props {
  children: ReactNode;
  color?: Color;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
  full?: boolean;
  type?: "button" | "submit";
  className?: string;
}

export default function BigButton({ children, color = "pink", href, onClick, disabled, small, full = true, className = "" }: Props) {
  const cls = `btn btn-${color} ${small ? "btn-sm" : ""} ${full ? "w-full" : ""} ${className}`;
  const press = { whileTap: { scale: 0.94, y: 4 }, transition: { type: "spring" as const, stiffness: 500, damping: 20 } };
  const tap = () => { audio.unlock(); audio.sfx("tap"); onClick?.(); };
  if (href) return <MLink href={href} className={cls} onClick={() => { audio.unlock(); audio.sfx("tap"); }} {...press}>{children}</MLink>;
  return <motion.button type="button" disabled={disabled} onClick={tap} className={cls} {...press}>{children}</motion.button>;
}
