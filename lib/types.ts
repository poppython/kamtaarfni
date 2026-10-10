export type VoiceKind = "wrong" | "correct" | "result_low" | "result_high";

export interface ClipRow {
  id: string;
  kind: VoiceKind;
  question_id: string | null;
  storage_path: string;
  mime_type: "audio/webm" | "audio/mp4";
  duration_ms: number;
}

/** Playable clip (url can be a public storage URL or a local blob URL). */
export interface ClipInfo {
  id: string;
  kind: VoiceKind;
  question_id: string | null;
  url: string;
  mime_type: string;
}

export interface PublicQuestion { id: string; position: number; text: string; options: string[] }
export interface QuizPublic {
  id: string;
  slug: string;
  title: string;
  creator_name: string;
  use_creator_voice: boolean;
  questions: PublicQuestion[];
  clips: ClipRow[];
}

export interface LeaderRow {
  id: string; name: string; avatar: string; score: number; total: number; finished_at: string; rank: number;
}
export interface Leaderboard { quiz: { title: string; creator_name: string }; rows: LeaderRow[] }

export interface CreatorQuestion extends PublicQuestion { correct_index: number }
export interface CreatorAnswer { question_id: string; selected_index: number; is_correct: boolean }
export interface CreatorParticipant {
  id: string; name: string; avatar: string; score: number; total: number; finished_at: string; answers: CreatorAnswer[];
}
export interface CreatorView {
  quiz: { id: string; slug: string; title: string; creator_name: string; use_creator_voice: boolean };
  questions: CreatorQuestion[];
  participants: CreatorParticipant[];
  clips: ClipRow[];
}

export interface RecResult { blob: Blob; mime: string; durationMs: number; url: string }
