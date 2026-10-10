import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { T } from "@/lib/phrases";

// Dynamic Open Graph tags so the link previews nicely on WhatsApp / Instagram / Messenger.
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let creator = "";
  if (url && key) {
    try {
      const sb = createClient(url, key, { auth: { persistSession: false } });
      const { data } = await sb.rpc("get_quiz_public", { p_slug: params.slug });
      creator = data?.creator_name ?? "";
    } catch {}
  }
  const title = creator ? T.share.shareText(creator) : `${T.appName} 🎯`;
  const og = `/api/og?name=${encodeURIComponent(creator)}`;
  return {
    title,
    description: T.tagline,
    openGraph: { title, description: T.tagline, type: "website", images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description: T.tagline, images: [og] },
  };
}

export default function QLayout({ children }: { children: React.ReactNode }) {
  return children;
}
