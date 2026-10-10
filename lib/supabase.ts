import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = Boolean(url && key);

// Placeholder values keep `next build` working before env vars are set.
export const supabase: SupabaseClient = createClient(url || "http://localhost:54321", key || "anon-key-missing", {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 5 } },
});

export const stickerUrl = (path: string) => `${url}/storage/v1/object/public/stickers/${path}`;
export const clipUrl = (path: string) => `${url}/storage/v1/object/public/voice-clips/${path}`;
