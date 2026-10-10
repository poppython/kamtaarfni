"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { T } from "@/lib/phrases";
import { audio } from "@/lib/audio";
import { fileToSticker, createDieCutSticker } from "@/lib/image";
import type { StickerDraft } from "@/lib/types";
import StickerBurst from "./StickerBurst";

export interface SItem { id: string; url: string; dieCutUrl?: string }

interface Props {
  items: SItem[];
  max?: number;
  onAdd: (s: StickerDraft) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

export default function StickerPicker({ items, max = 5, onAdd, onDelete }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [dieCutUrls, setDieCutUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const generateDieCut = async () => {
      const newUrls: Record<string, string> = {};
      for (const item of items) {
        if (!item.dieCutUrl) {
          try {
            newUrls[item.id] = await createDieCutSticker(item.url);
          } catch (e) {
            console.error("Failed to create die-cut sticker:", e);
            newUrls[item.id] = item.url;
          }
        } else {
          newUrls[item.id] = item.dieCutUrl;
        }
      }
      setDieCutUrls(newUrls);
    };
    if (items.length > 0) generateDieCut();
  }, [items]);

  const pick = async (file?: File) => {
    if (!file) return;
    setMsg(null); setBusy(true);
    try {
      const s = await fileToSticker(file);
      await onAdd(s);
    } catch (e) {
      setMsg((e as Error).message === "not-image" ? T.stickers.notImage : T.stickers.failed);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const test = () => { audio.unlock(); setBurst((b) => b + 1); };

  return (
    <div className="rounded-3xl bg-lav/70 p-4">
      <div className="font-title text-lg font-bold">{T.stickers.heading}</div>
      <p className="mt-1 text-sm text-ink/70">{T.stickers.intro}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {items.map((it) => {
          const displayUrl = dieCutUrls[it.id] || it.url;
          return (
            <motion.div key={it.id} initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative">
              <img src={displayUrl} alt="" className="h-20 w-20 drop-shadow-[0_0_0_4px_#fff,0_4px_12px_rgba(59,42,92,.3)]" />
              <button aria-label={T.stickers.delete} onClick={() => onDelete(it.id)}
                className="absolute -left-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-pink text-sm text-white shadow active:scale-90">✖</button>
            </motion.div>
          );
        })}
        {items.length < max ? (
          <button onClick={() => input.current?.click()} disabled={busy}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-4 border-dashed border-grape/50 bg-white text-3xl text-grape active:scale-90 disabled:opacity-50">
            {busy ? "⏳" : "📷"}
          </button>
        ) : <span className="text-sm text-ink/60">{T.stickers.full(max)}</span>}
      </div>

      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />

      {items.length === 0 && <p className="mt-2 text-sm text-ink/60">{T.stickers.noneNote}</p>}
      {busy && <p className="mt-2 text-sm font-bold text-grape">{T.stickers.working}</p>}
      {msg && <p className="mt-2 rounded-2xl bg-sun/40 p-3 text-center text-sm">{msg}</p>}

      <button onClick={test} className="mt-3 w-full rounded-2xl bg-sun px-4 py-3 font-title text-lg font-bold text-ink shadow-[0_4px_0_#E0B43A] active:translate-y-1 active:shadow-none">
        {T.stickers.test}
      </button>
      <StickerBurst trigger={burst} images={items.map((i) => dieCutUrls[i.id] || i.url)} />
    </div>
  );
}