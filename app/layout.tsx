import type { Metadata, Viewport } from "next";
import { Baloo_Bhaijaan_2, Cairo } from "next/font/google";
import "./globals.css";
import FloatingEmojis from "@/components/FloatingEmojis";
import MuteButton from "@/components/MuteButton";
import SWRegister from "@/components/SWRegister";
import { T } from "@/lib/phrases";

const title = Baloo_Bhaijaan_2({ subsets: ["arabic", "latin"], variable: "--font-title", display: "swap" });
const body = Cairo({ subsets: ["arabic", "latin"], variable: "--font-body", display: "swap" });

const site =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: `${T.appName} 🎯`,
  description: T.tagline,
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  openGraph: { title: `${T.appName} 🎯`, description: T.tagline, type: "website", locale: "ar_AR", images: ["/api/og"] },
  twitter: { card: "summary_large_image", images: ["/api/og"] },
  appleWebApp: { capable: true, title: T.appName, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F3EEFF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${title.variable} ${body.variable}`}>
      <body>
        <FloatingEmojis />
        <MuteButton />
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
