# كم تعرفني؟ — "How well do you know me?"

Mobile-first Arabic (RTL) friend-quiz PWA. Next.js 14 (App Router) · TypeScript · Tailwind · Framer Motion · Howler.js · canvas-confetti · Supabase (Postgres + Realtime + Storage + Edge Function).

The creator writes their own questions, records their own voice reactions, shares a link; friends play, get a score and land on a live leaderboard. No login.

## Setup

### 1. Supabase project
1. Create a project at https://supabase.com.
2. **SQL Editor → New query →** paste `supabase/migrations/001_init.sql` → **Run**. Then do the same with `supabase/migrations/002_stickers.sql` (photo stickers).
   This creates the tables, RLS (on, with no policies → no direct client access), all RPC functions, and the `voice-clips` storage bucket (public read, 300 KB max, `audio/webm` + `audio/mp4` only).
3. Check **Storage**: bucket `voice-clips` should exist. (If your plan blocks SQL bucket creation, create it manually with the same settings.)
4. **Realtime:** nothing to enable. The leaderboard uses Realtime *broadcast* sent from `finish_quiz()`, so tables stay fully private. (A 20 s polling fallback is built in.)

### 2. Edge Function (secure voice upload)
```bash
npm i -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy voice-upload   # re-run this after updating: it now also handles sticker photos
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

## v2 — photo stickers, talking pets, new look

**Photo stickers (the viral part 📸)**
- The creator adds up to 5 photos (gallery or camera) in the "صوتك وصورك" step, or later from the manage link. Photos are cropped square, shrunk to 256 px and compressed on the phone (≈ 15–40 KB).
- When a friend answers wrong, the photos fly in from the **top-left or top-right corner** at random, land in random spots, **flash**, and go "beep beep beep beep" (generated with WebAudio, no file needed). With no photos, funny emojis (😹🤦🙈…) pop up instead.
- The beeps follow the mute button and drop to 30 % while the creator's voice clip plays.
- Backend: `002_stickers.sql` adds the `stickers` table, the `stickers` bucket (public read, 150 KB, webp/jpeg/png), and the RPCs `add_sticker` / `delete_sticker`; `get_quiz_public` and `get_creator_view` now return stickers. Uploads still go only through the Edge Function (token check + signed URL).
- The app still works if you haven't run `002` yet (no stickers, emoji fallback), but uploading photos needs it.

**Talking pets 🐶🐱**
- New cartoon puppy and kitten (`components/Pet.tsx`) with moods (idle / happy / sad), wagging tail, blinking and a talking mouth. The home screen has puppy + mascot + kitten taking turns to talk; the friend landing, result, share and leaderboard screens have a pet with a speech bubble.
- **Tap a pet to hear it speak** the line in Arabic (browser text-to-speech).
- All the lines ("أنت صرت صديقي!", "أنت توأم روحي!"…) are in `PET_LINES` inside `lib/phrases.ts`.

**Look**
- Paw-print background, sticker-style cards, glossy chunky buttons, candy-colored answer buttons, outlined titles.

**Fixes**
- Removed the 8 empty placeholder files in `public/sounds/voices/` (they were silent, which blocked the spoken fallback). `audio.ts` now also treats any tiny/silent voice file as missing. Add real recordings with the names in `public/sounds/SOUNDS.md` whenever you like.
- `.env.example` is back to placeholders (keep your real keys only in `.env.local`).
- Share page wrapped in `Suspense` again (needed for `next build`).

## Updating from an older copy (important)
1. Unzip so the files land **directly inside your existing project folder** (same folder as `package.json`), overwriting. The zip has no wrapper folder.
2. Delete the `.next` folder, then restart: `npm run dev`.
3. Hard-refresh the browser (on a phone: close the tab and reopen). If you ever installed the app/PWA, clear site data once so the old service worker goes away.
4. You should see **"v2 🐾"** at the bottom of the home screen and the puppy + cat + mascot at the top. In *Create* there are now 5 steps: عنك · صوتك · **صورك** · أسئلتك · نشر.
