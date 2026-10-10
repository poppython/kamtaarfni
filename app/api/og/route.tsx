import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Cute cover image for link previews. Cairo font is fetched so Arabic text renders.
// If Arabic letters ever look disconnected on your deployment, swap this route for a static PNG at /public/og-cover.png.
export async function GET(req: NextRequest) {
  const name = (req.nextUrl.searchParams.get("name") || "").slice(0, 30);
  let font: ArrayBuffer | null = null;
  try {
    font = await fetch("https://cdn.jsdelivr.net/fontsource/fonts/cairo@latest/arabic-800-normal.woff").then((r) => r.arrayBuffer());
  } catch {}

  const line1 = name ? `${name} تحداك!` : "كم تعرفني؟";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg,#FFE0EE 0%,#E6DDFF 50%,#D9ECFF 100%)", fontFamily: "Cairo", color: "#3B2A5C" }}>
        <div style={{ display: "flex", fontSize: 200 }}>😺</div>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 800, direction: "rtl", color: "#8B6CFF" }}>{line1}</div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, direction: "rtl", marginTop: 10 }}>كم تعرفني؟ 🎯</div>
      </div>
    ),
    { width: 1200, height: 630, fonts: font ? [{ name: "Cairo", data: font, weight: 800, style: "normal" }] : undefined }
  );
}
