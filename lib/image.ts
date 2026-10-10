import type { StickerDraft } from "./types";

const MAX_BYTES = 150 * 1024;
const STICKER_SIZE = 512;

async function loadBitmap(file: File): Promise<{ src: CanvasImageSource; w: number; h: number }> {
  try {
    const b = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    return { src: b, w: b.width, h: b.height };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error("image load failed"));
        i.src = url;
      });
      return { src: img, w: img.naturalWidth, h: img.naturalHeight };
    } finally { URL.revokeObjectURL(url); }
  }
}

const toBlob = (c: HTMLCanvasElement, type: string, q: number) => new Promise<Blob | null>((res) => c.toBlob(res, type, q));

export async function fileToSticker(file: File, size = STICKER_SIZE): Promise<StickerDraft> {
  if (!file.type.startsWith("image/")) throw new Error("not-image");
  const { src, w, h } = await loadBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const s = Math.min(w, h);
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(src, (w - s) / 2, (h - s) / 2, s, s, 0, 0, size, size);
  for (const [type, q] of [["image/webp", 0.85], ["image/jpeg", 0.82], ["image/jpeg", 0.6]] as const) {
    const blob = await toBlob(canvas, type, q);
    if (blob && blob.type === type && blob.size <= MAX_BYTES) return { blob, mime: type, url: URL.createObjectURL(blob) };
  }
  throw new Error("compress-failed");
}

export async function createDieCutSticker(imageUrl: string, size = STICKER_SIZE, outlineWidth = 8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const scale = Math.min(size / img.width, size / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const offsetX = (size - drawW) / 2;
        const offsetY = (size - drawH) / 2;

        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        const threshold = 30;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r + g + b) / 3;
            if (brightness > 255 - threshold) {
              data[idx + 3] = 0;
            }
          }
        }

        const outlineData = new Uint8ClampedArray(data);
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            if (data[idx + 3] === 0) {
              let isEdge = false;
              for (let dy = -outlineWidth; dy <= outlineWidth; dy++) {
                for (let dx = -outlineWidth; dx <= outlineWidth; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist > outlineWidth) continue;
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                    const nIdx = (ny * size + nx) * 4;
                    if (data[nIdx + 3] > 0) {
                      isEdge = true;
                      break;
                    }
                  }
                }
                if (isEdge) break;
              }
              if (isEdge) {
                outlineData[idx] = 255;
                outlineData[idx + 1] = 255;
                outlineData[idx + 2] = 255;
                outlineData[idx + 3] = 255;
              }
            }
          }
        }

        ctx.putImageData(new ImageData(outlineData, size, size), 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
  });
}