"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

/** Page-transition wrapper used by every screen. */
export default function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={`relative z-10 mx-auto w-full max-w-md px-4 pb-16 pt-16 md:max-w-xl ${className}`}
    >
      {children}
    </motion.main>
  );
}
