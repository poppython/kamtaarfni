# كم تعرفني؟ — "How well do you know me?"

Mobile-first Arabic (RTL) friend-quiz PWA. Next.js 14 (App Router) · TypeScript · Tailwind · Framer Motion · Howler.js · canvas-confetti · Supabase (Postgres + Realtime + Storage + Edge Function).

The creator writes their own questions, records their own voice reactions, shares a link; friends play, get a score and land on a live leaderboard. No login.

## Setup

### 1. Supabase project
1. Create a project at https://supabase.com.
2. **SQL Editor → New query →** paste `supabase/migrations/001_init.sql` → **Run**.
   This creates the tables, RLS (on, with no policies → no direct client access), all RPC functions, and the `voice-clips` storage bucket (public read, 300 KB max, `audio/webm` + `audio/mp4` only).
3. Check **Storage**: bucket `voice-clips` should exist. (If your plan blocks SQL bucket creation, create it manually with the same settings.)
4. **Realtime:** nothing to enable. The leaderboard uses Realtime *broadcast* sent from `finish_quiz()`, so tables stay fully private. (A 20 s polling fallback is built in.)

### 2. Edge Function (secure voice upload)
```bash
npm i -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy voice-upload
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically. Friends can never upload: the function only signs an upload URL if the request carries a valid `creator_token`.

### 3. Env vars
```bash
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL      → Project Settings → API → Project URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY → Project Settings → API → anon public key
# NEXT_PUBLIC_SITE_URL          → (optional) your public URL, for Open Graph
```

### 4. Run locally
```bash
npm install
npm run dev     # http://localhost:3000
```
Microphone recording needs **HTTPS** (or `localhost`). To test on your phone, deploy to Vercel or use a tunnel (e.g. `ngrok http 3000`).

### 5. Deploy to Vercel
1. Push to GitHub → **Import** in Vercel (framework: Next.js, auto-detected).
2. Add the env vars above → **Deploy**.

### 6. Sounds
Synthetic placeholder sound effects are already in `public/sounds/`. See `public/sounds/SOUNDS.md` for the exact file names of the funny voice lines you should add (until then the browser's Arabic TTS is used).

## Where to edit things
- **All Arabic UI text + funny phrases + default voice lines:** `lib/phrases.ts` (switch to Tunisian dialect here).
- Mascot: `components/Mascot.tsx` · Colors: `tailwind.config.ts` · Button styles: `app/globals.css`.

## How it's built (security)
- RLS is on for every table and **no policies exist**; `anon` has no table privileges. All access goes through `security definer` RPCs.
- `get_quiz_public` never returns `correct_index`. `submit_answer` returns it only after the answer is locked in (one answer per question per participant).
- Creator-only RPCs (`get_creator_view`, `add_voice_clip`, `delete_voice_clip`, `set_use_creator_voice`) require the secret `creator_token` (kept in localStorage and in the private manage link `/manage/<slug>?t=<token>`).
- `add_voice_clip` also checks that the file really exists in storage under `<quiz_id>/…`, limits 3 clips per slot (1 per question) and checks duration (0.5–5.5 s).
- Note: I added a `p_storage_path` parameter to `add_voice_clip` (your spec listed no path argument, but the clip has to be linked to its uploaded file).

## Flow
- Create → questions + (optional) voice clips are held on the device → on **نشر الاختبار**: `create_quiz` RPC → each clip: Edge Function signs → upload → `add_voice_clip`. A failed clip upload never blocks publishing.
- Play → name + avatar → `join_quiz` → `submit_answer` per question → `finish_quiz` (score, rank, realtime broadcast).
- Voice logic (`lib/audio.ts`): per-question clip → random creator clip for the event → default file → speechSynthesis. Never the same clip twice in a row; other effects duck to 30 % while a creator clip plays; the corner mute button silences everything.

## Known notes / things to test on real devices
- **iOS Safari** records `audio/mp4`; Chrome/Android records `audio/webm`. Each clip stores its mime type and Howler gets the matching format (`html5: true`). Very old iOS versions can't play webm, so a clip recorded on Android may be silent on an old iPhone (the app then falls back to default voice lines).
- **Instagram** has no web share intent: the button copies the link and opens Instagram.
- **Messenger** uses the `fb-messenger://` deep link (works on phones with the app).
- **Open Graph image** (`/api/og`) renders Arabic text with Cairo via `next/og`. If letters look disconnected after deploy, replace it with a static `public/og-cover.png`.
- `public/sw.js` is a small service worker (installability + caching sounds/static files); it's only registered in production builds.
- Fonts (Baloo Bhaijaan 2, Cairo) load via `next/font/google` at build time, so the build machine needs internet (Vercel does).
- Phase checklist from your brief is all included: create/share/play/result/leaderboard, design + mascot + sounds, voice recording/upload/playback, realtime, private view, Open Graph, QR, PWA.

## Project structure
```
app/            pages (home, create, share/[slug], q/[slug], q/[slug]/leaderboard, manage/[slug], api/og)
components/     Mascot, Game, VoiceSlot, Waveform, BigButton, MuteButton, FloatingEmojis…
lib/            phrases.ts, audio.ts, useRecorder.ts, api.ts, supabase.ts, local.ts, types.ts
supabase/       migrations/001_init.sql, functions/voice-upload/index.ts
public/         manifest.json, sw.js, icons, sounds/
```
