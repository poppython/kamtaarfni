// Supabase Edge Function: voice-upload
// Validates the creator_token, then hands out a signed upload URL (or deletes a file).
// Friends/anonymous users can NEVER upload: they don't have a token for any quiz.
//
// Deploy:  supabase functions deploy voice-upload
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const KINDS = ["wrong", "correct", "result_low", "result_high"];
const MIME_EXT: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CLIPS_PER_QUIZ = 40;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  const { action, quiz_id, creator_token } = body;
  if (!UUID.test(quiz_id ?? "") || !UUID.test(creator_token ?? "")) return json({ error: "bad credentials" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // 1) Validate the secret creator token
  const { data: quiz } = await admin.from("quizzes").select("id").eq("id", quiz_id).eq("creator_token", creator_token).maybeSingle();
  if (!quiz) return json({ error: "forbidden" }, 403);

  // 2a) Issue a signed upload URL
  if (action === "sign") {
    const { kind, mime_type } = body;
    if (!KINDS.includes(kind)) return json({ error: "bad kind" }, 400);
    const ext = MIME_EXT[mime_type];
    if (!ext) return json({ error: "bad mime type" }, 400);

    const { count } = await admin.from("voice_clips").select("id", { count: "exact", head: true }).eq("quiz_id", quiz_id);
    if ((count ?? 0) >= MAX_CLIPS_PER_QUIZ) return json({ error: "too many clips" }, 429);

    const path = `${quiz_id}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await admin.storage.from("voice-clips").createSignedUploadUrl(path);
    if (error || !data) return json({ error: error?.message ?? "sign failed" }, 500);
    return json({ path: data.path, token: data.token, signedUrl: data.signedUrl });
  }

  // 2b) Remove a file (after the RPC delete_voice_clip returned its path)
  if (action === "remove") {
    const { path } = body;
    if (typeof path !== "string" || !path.startsWith(`${quiz_id}/`) || path.includes("..")) return json({ error: "bad path" }, 400);
    const { error } = await admin.storage.from("voice-clips").remove([path]);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "unknown action" }, 400);
});
