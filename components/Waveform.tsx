"use client";
import { useEffect, useRef } from "react";

export default function Waveform({ analyser }: { analyser: AnalyserNode | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext("2d")!;
    const data = new Uint8Array(analyser ? analyser.frequencyBinCount : 32);
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      analyser?.getByteFrequencyData(data);
      g.clearRect(0, 0, canvas.width, canvas.height);
      const n = 24, bw = canvas.width / n;
      for (let i = 0; i < n; i++) {
        const v = analyser ? data[Math.floor((i / n) * data.length * 0.7)] / 255 : 0.1;
        const h = Math.max(6, v * canvas.height);
        g.fillStyle = i % 2 ? "#FF7DAA" : "#8B6CFF";
        const x = i * bw + 3, y = (canvas.height - h) / 2;
        g.beginPath(); g.roundRect(x, y, bw - 6, h, 6); g.fill();
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser]);
  return <canvas ref={ref} width={260} height={56} className="mx-auto block h-14 w-[260px]" aria-hidden />;
}
