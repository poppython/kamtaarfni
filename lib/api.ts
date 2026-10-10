import { supabase, clipUrl, stickerUrl } from "./supabase";
import type { ClipInfo, ClipRow, CreatorView, Leaderboard, QuizPublic, StickerRow, VoiceKind } from "./types";

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const createQuiz = (title: string, creatorName: string, questions: { text: string; options: string[]; correct_index: number }[]) =>
  rpc<{ id: string; slug: string; creator_token: string; question_ids: string[] }>("create_quiz", {
    p_title: title, p_creator_name: creatorName, p_questions: questions,
  });

export const getQuizPublic = (slug: string) => rpc<QuizPublic | null>("get_quiz_public", { p_slug: slug });
export const joinQuiz = (slug: string, name: string, avatar: string) =>
  rpc<{ id: string; total: number }>("join_quiz", { p_slug: slug, p_name: name, p_avatar: avatar });
export const submitAnswer = (pid: string, qid: string, idx: number) =>
  rpc<{ is_correct: boolean; correct_index: number }>("submit_answer", { p_participant_id: pid, p_question_id: qid, p_selected_index: idx });
export const finishQuiz = (pid: string) => rpc<{ score: number; total: number; rank: number }>("finish_quiz", { p_participant_id: pid });
export const getLeaderboard = (slug: string) => rpc<Leaderboard | null>("get_leaderboard", { p_slug: slug });
export const getCreatorView = (slug: string, token: string) => rpc<CreatorView>("get_creator_view", { p_slug: slug, p_creator_token: token });
export const setUseCreatorVoice = (quizId: string, token: string, enabled: boolean) =>
  rpc<null>("set_use_creator_voice", { p_quiz_id: quizId, p_creator_token: token, p_enabled: enabled });

export const toClipInfo = (c: ClipRow): ClipInfo => ({
  id: c.id, kind: c.kind, question_id: c.question_id, url: clipUrl(c.storage_path), mime_type: c.mime_type,
});

/** Upload one recorded clip: Edge Function (token check) → signed upload → register via RPC. */
export async function uploadClip(p: {
  quizId: string; token: string; kind: VoiceKind; questionId: string | null;
  blob: Blob; mime: string; durationMs: number;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke("voice-upload", {
    body: { action: "sign", quiz_id: p.quizId, creator_token: p.token, kind: p.kind, question_id: p.questionId, mime_type: p.mime },
  });
  if (error || !data?.path) throw new Error(error?.message ?? "sign failed");
  const up = await supabase.storage.from("voice-clips").uploadToSignedUrl(data.path, data.token, p.blob, { contentType: p.mime });
  if (up.error) throw new Error(up.error.message);
  await rpc("add_voice_clip", {
    p_quiz_id: p.quizId, p_creator_token: p.token, p_kind: p.kind, p_question_id: p.questionId,
    p_mime_type: p.mime, p_duration_ms: p.durationMs, p_storage_path: data.path,
  });
}

export async function deleteClip(quizId: string, token: string, clipId: string): Promise<void> {
  const path = await rpc<string>("delete_voice_clip", { p_clip_id: clipId, p_creator_token: token });
  await supabase.functions.invoke("voice-upload", { body: { action: "remove", quiz_id: quizId, creator_token: token, path } });
}

export const toStickerUrl = (s: StickerRow) => stickerUrl(s.storage_path);

/** Upload one sticker photo: Edge Function (token check) → signed upload → register via RPC. */
export async function uploadSticker(p: { quizId: string; token: string; blob: Blob; mime: string }): Promise<void> {
  const { data, error } = await supabase.functions.invoke("voice-upload", {
    body: { action: "sign_sticker", quiz_id: p.quizId, creator_token: p.token, mime_type: p.mime },
  });
  if (error || !data?.path) throw new Error(error?.message ?? "sign failed");
  const up = await supabase.storage.from("stickers").uploadToSignedUrl(data.path, data.token, p.blob, { contentType: p.mime });
  if (up.error) throw new Error(up.error.message);
  await rpc("add_sticker", { p_quiz_id: p.quizId, p_creator_token: p.token, p_mime_type: p.mime, p_storage_path: data.path });
}

export async function deleteSticker(quizId: string, token: string, stickerId: string): Promise<void> {
  const path = await rpc<string>("delete_sticker", { p_sticker_id: stickerId, p_creator_token: token });
  await supabase.functions.invoke("voice-upload", { body: { action: "remove_sticker", quiz_id: quizId, creator_token: token, path } });
}

/** Realtime: the DB broadcasts "finished" on topic lb:<slug>. Returns an unsubscribe fn. */
export function subscribeLeaderboard(slug: string, onChange: () => void): () => void {
  const ch = supabase.channel("lb:" + slug).on("broadcast", { event: "finished" }, onChange).subscribe();
  return () => { supabase.removeChannel(ch); };
}
