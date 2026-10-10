// Everything that lives on the device (localStorage). All access is guarded.
export interface MyQuiz { slug: string; quiz_id: string; title: string; creator_name: string; token: string; created_at: number }
export interface SavedPlay {
  participant_id: string; name: string; avatar: string; finished: boolean;
  score?: number; total?: number; rank?: number;
}

const read = <T,>(k: string, fallback: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export const getMyQuizzes = (): MyQuiz[] => read<MyQuiz[]>("kt_quizzes", []);
export const saveMyQuiz = (q: MyQuiz) => {
  const list = getMyQuizzes().filter((x) => x.slug !== q.slug);
  write("kt_quizzes", [q, ...list]);
};
export const getToken = (slug: string): string | null => getMyQuizzes().find((q) => q.slug === slug)?.token ?? null;

export const getPlay = (slug: string): SavedPlay | null => read<SavedPlay | null>("kt_p_" + slug, null);
export const savePlay = (slug: string, p: SavedPlay) => write("kt_p_" + slug, p);
export const clearPlay = (slug: string) => { try { localStorage.removeItem("kt_p_" + slug); } catch {} };

export const getMuted = (): boolean => read<boolean>("kt_muted", false);
export const saveMuted = (m: boolean) => write("kt_muted", m);
