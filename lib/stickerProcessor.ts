"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation_solution_simd_wasm_bin.wasm";

interface StickerResult {
  url: string;
  originalUrl: string;
}

export function useStickerProcessor() {
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const segmentationRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let mounted = true;
    const script = document.createElement("script");
    script.src = MODEL_URL + "selfie_segmentation_solution_simd_wasm_bin.js";
    script.async = true;
    script.onload = () => {
      if (!mounted) return;
      try {
        const { SelfieSegmentation } = (window as any);
        const segmentation = new SelfieSegmentation({
          locateFile: (file: string) => {
            if (file.endsWith(".wasm")) return WASM_URL;
            return MODEL_URL + file;
          },
        });
        segmentation.setOptions({
          modelSelection: 1,
          selfieMode: true,
        });
        segmentationRef.current = segmentation;
        setReady(true);
      } catch (e) {
        console.error("Failed to init SelfieSegmentation:", e);
      }
    };
    document.head.appendChild(script);
    return () => { mounted = false; };
  }, []);

  const processImage = useCallback(async (imageUrl: string): Promise<StickerResult> => {
    if (!segmentationRef.current) throw new Error("Segmentation not ready");
    if (processing) throw new Error("Already processing");

    setProcessing(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = canvasRef.current || document.createElement("canvas");
      canvasRef.current = canvas;
      const ctx = canvas.getContext("2d")!;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const result = await new Promise<ImageData>((resolve, reject) => {
        segmentationRef.current!.onResults((results: any) => {
          if (results.segmentationMask) {
            const mask = results.segmentationMask;
            const imageData = ctx.createImageData(canvas.width, canvas.height);
            const data = imageData.data;
            const maskData = mask.data;
            for (let i = 0; i < maskData.length; i++) {
              const alpha = maskData[i] > 0.5 ? 255 : 0;
              data[i * 4 + 3] = alpha;
            }
            resolve(imageData);
          } else {
            reject(new Error("No segmentation mask"));
          }
        });
        segmentationRef.current!.send({ image: canvas });
      });

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(result, 0, 0);

      const stickerUrl = canvas.toDataURL("image/png");
      return { url: stickerUrl, originalUrl: imageUrl };
    } finally {
      setProcessing(false);
    }
  }, [processing]);

  const processMultiple = useCallback(async (imageUrls: string[]): Promise<StickerResult[]> => {
    const results: StickerResult[] = [];
    for (const url of imageUrls) {
      try {
        results.push(await processImage(url));
      } catch (e) {
        console.error("Failed to process sticker:", url, e);
        results.push({ url, originalUrl: url });
      }
    }
    return results;
  }, [processImage]);

  return { ready, processing, processImage, processMultiple };
}

export function createDieCutSticker(
  imageUrl: string,
  maxSize = 200,
  outlineWidth = 6,
  outlineColor = "#FFFFFF"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            const alpha = data[idx + 3];
            if (alpha === 0) {
              let isEdge = false;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
                    const nIdx = (ny * canvas.width + nx) * 4;
                    if (data[nIdx + 3] > 0) {
                      isEdge = true;
                      break;
                    }
                  }
                }
                if (isEdge) break;
              }
              if (isEdge) {
                data[idx] = parseInt(outlineColor.slice(1, 3), 16);
                data[idx + 1] = parseInt(outlineColor.slice(3, 5), 16);
                data[idx + 2] = parseInt(outlineColor.slice(5, 7), 16);
                data[idx + 3] = 255;
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
  });
}