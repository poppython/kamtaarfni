"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import PetTrio from "@/components/PetTrio";
import BigButton from "@/components/BigButton";
import Screen from "@/components/Screen";
import { PET_LINES, T } from "@/lib/phrases";
import { getMyQuizzes, MyQuiz } from "@/lib/local";

export default function Home() {
  const [quizzes, setQuizzes] = useState<MyQuiz[]>([]);
  useEffect(() => setQuizzes(getMyQuizzes()), []);

  return (
    <Screen>
      <div className="flex flex-col items-center text-center">
        <PetTrio lines={PET_LINES.home} />
        <h1 className="title-pop mt-4 text-6xl leading-tight">{T.appName}</h1>
        <p className="mt-2 max-w-xs text-lg text-ink/70">{T.tagline}</p>
        <div className="mt-6 w-full max-w-xs"><BigButton href="/create" color="pink">{T.home.start} 🎯</BigButton></div>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 font-title text-2xl font-bold">{T.home.myQuizzes}</h2>
        {quizzes.length === 0 ? (
          <div className="card text-center text-ink/70">{T.home.empty}</div>
        ) : (
          <ul className="space-y-3">
            {quizzes.map((q, i) => (
              <motion.li key={q.slug} className="card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="font-title text-xl font-bold">{q.title}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
                  <Link className="rounded-xl bg-mint/60 px-3 py-2" href={`/share/${q.slug}`}>📤 {T.home.share}</Link>
                  <Link className="rounded-xl bg-sky/50 px-3 py-2" href={`/q/${q.slug}/leaderboard`}>🏆 {T.home.leaderboard}</Link>
                  <Link className="rounded-xl bg-sun/60 px-3 py-2" href={`/manage/${q.slug}?t=${q.token}`}>🔒 {T.home.manage}</Link>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-10 text-center text-xs text-ink/40">v2 🐾</p>
    </Screen>
  );
}
