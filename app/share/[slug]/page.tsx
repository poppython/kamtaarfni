"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import Mascot from "@/components/Mascot";
import BigButton from "@/components/BigButton";
import Screen from "@/components/Screen";
import { T } from "@/lib/phrases";
import { getMyQuizzes, MyQuiz } from "@/lib/local";

export default function SharePage() {
  const { slug } = useParams<{ slug: string }>();
  const sp = useSearchParams();
  const [quiz, setQuiz] = useState<MyQuiz | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<"link" | "manage" | null>(null);
  const [igHint, setIgHint] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setQuiz(getMyQuizzes().find((q) => q.slug === slug) ?? null);
    setCanShare(typeof navigator.share === "function");
  }, [slug]);

  const link = `${origin}/q/${slug}`;
  const manage = quiz ? `${origin}/manage/${slug}?t=${quiz.token}` : "";
  const msg = `${T.share.shareText((quiz?.creator_name ?? ""))}\n${link}`;

  const copy = async (what: "link" | "manage") => {
    try { await navigator.clipboard.writeText(what === "link" ? link : manage); } catch {}
    setCopied(what); setTimeout(() => setCopied(null), 2000);
  };
  const nativeShare = () => navigator.share({ title: T.appName, text: T.share.shareText((quiz?.creator_name ?? "")), url: link }).catch(() => {});

  if (!origin) return null;

  return (
    <Screen>
      <div className="flex flex-col items-center text-center">
        <Mascot mood="dance" size={140} />
        <h1 className="font-title text-3xl font-bold">{T.share.heading}</h1>
      </div>

      {sp.get("voicefail") && <p className="mt-4 rounded-2xl bg-sun/50 p-3 text-center text-sm font-bold">{T.create.voiceUploadFailed}</p>}

      <div className="card mt-5 space-y-4">
        <div className="font-bold">{T.share.linkLabel}</div>
        <div dir="ltr" className="break-all rounded-2xl bg-lav p-3 text-left text-sm font-bold">{link}</div>
        <BigButton color="grape" onClick={() => copy("link")}>{copied === "link" ? T.share.copied : `📋 ${T.share.copy}`}</BigButton>

        <div className="grid grid-cols-2 gap-3">
          <BigButton color="mint" small onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")}>💬 {T.share.whatsapp}</BigButton>
          <BigButton color="sky" small onClick={() => window.open(`fb-messenger://share?link=${encodeURIComponent(link)}`, "_blank")}>✉️ {T.share.messenger}</BigButton>
          <BigButton color="pink" small onClick={() => { copy("link"); setIgHint(true); window.open("https://www.instagram.com/", "_blank"); }}>📸 {T.share.instagram}</BigButton>
          {canShare && <BigButton color="sun" small onClick={nativeShare}>📤 {T.share.native}</BigButton>}
        </div>
        {igHint && <p className="rounded-2xl bg-lav p-3 text-sm">{T.share.instagramHint}</p>}

        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="text-sm text-ink/70">{T.share.qr}</div>
          <div className="rounded-2xl bg-white p-3 ring-4 ring-lav"><QRCodeSVG value={link} size={168} fgColor="#3B2A5C" /></div>
        </div>
      </div>

      {quiz && (
        <div className="card mt-5 space-y-3 border-2 border-dashed border-pink/50">
          <div className="font-title text-xl font-bold">{T.share.manageHeading}</div>
          <p className="text-sm text-ink/70">{T.share.manageWarn}</p>
          <div dir="ltr" className="break-all rounded-2xl bg-lav p-3 text-left text-xs">{manage}</div>
          <BigButton color="sun" small onClick={() => copy("manage")}>{copied === "manage" ? T.share.copied : `🔒 ${T.share.copy}`}</BigButton>
          <BigButton color="ghost" small href={`/manage/${slug}?t=${quiz.token}`}>{T.share.openManage}</BigButton>
        </div>
      )}

      <div className="mt-5"><BigButton color="ghost" href={`/q/${slug}/leaderboard`}>🏆 {T.share.openLeaderboard}</BigButton></div>
    </Screen>
  );
}