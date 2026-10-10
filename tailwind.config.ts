import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.ts"],
  theme: {
    extend: {
      colors: {
        ink: "#3B2A5C",
        lav: "#F3EEFF",
        pink: "#FF7DAA",
        mint: "#6FE0B0",
        sky: "#8EC9FF",
        sun: "#FFD86B",
        grape: "#8B6CFF",
      },
      fontFamily: {
        title: ["var(--font-title)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: { soft: "0 10px 30px -8px rgba(139,108,255,.28)" },
    },
  },
  plugins: [],
};
export default config;
