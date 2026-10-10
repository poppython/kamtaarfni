"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import Mascot from "@/components/Mascot";
import BigButton from "@/components/BigButton";
import Screen from "@/components/Screen";
import { T } from "@/lib/phrases";
import { getLeaderboard, subscribeLeaderboard } from "@/lib/api";
import { getToken } from "@/lib/local";
import type { Leaderboard } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<Leaderboard | null>(null);
  const [missing, setMissing] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await getLeaderboard(slug);
      if (!d) setMissing(true); else setData(d);
    } catch { /* keep the last data */ }
  }, [slug]);

  useEffect(() => {
    setToken(getToken(slug));
    load();
    const off = subscribeLeaderboard(slug, load); // realtime
    const poll = setInterval(load, 20000);          // safety net
    return () => { off(); clearInterval(poll); };
  }, [slug, load]);

  if (missing) return <Screen><div className="flex flex-col items-center gap-5 pt-10 text-center"><Mascot mood="wrong" size={130} /><p className="font-title text-2xl font-bold">{T.notFound}</p><BigButton href="/" color="grape">{T.backHome}</BigButton></div></Screen>;

  return (
    <Screen>
      <div className="flex flex-col items-center text-center">
        <Mascot mood="dance" size={120} />
        <h1 className="font-title text-3xl font-bold">{T.leaderboard.heading}</h1>
        {data && <p className="text-ink/70">{data.quiz.title} • {data.quiz.creator_name}</p>}
        <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold">
          <motion.span className="h-2.5 w-2.5 rounded-full bg-[#FF3D5A]" animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} /> {T.leaderboard.live}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {!data && <p className="text-center font-bold">{T.loading}</p>}
        {data && data.rows.length === 0 && <div className="card text-center text-ink/70">{T.leaderboard.empty}</div>}
        <AnimatePresence initial={false}>
          {data?.rows.map((r) => (
            <motion.div layout key={r.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className={`card flex items-center gap-3 !p-4 ${r.rank === 1 ? "ring-4 ring-sun" : ""}`}>
              <div className="w-10 text-center font-title text-2xl font-extrabold">{r.rank <= 3 ? MEDALS[r.rank - 1] : `#${r.rank}`}</div>
              <div className="text-3xl">{r.avatar}</div>
              <div className="flex-1 truncate font-title text-xl font-bold">{r.name}</div>
              <div className="rounded-full bg-lav px-3 py-1 font-title text-lg font-bold text-grape">{r.score}/{r.total}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-6 space-y-3">
        <BigButton href={`/q/${slug}`} color="pink">{T.leaderboard.play}</BigButton>
        <BigButton href="/create" color="ghost">{T.result.makeYours}</BigButton>
        {token && <Link href={`/manage/${slug}?t=${token}`} className="block text-center font-bold text-grape underline">{T.leaderboard.manageLink}</Link>}
      </div>
    </Screen>
  );
}
