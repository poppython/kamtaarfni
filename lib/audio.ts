"use client";
import { Howl, Howler } from "howler";
import { useSyncExternalStore } from "react";
import { DEFAULT_VOICES, SPEECH_LANG, VoiceEvent } from "./phrases";
import { getMuted, saveMuted } from "./local";
import type { ClipInfo } from "./types";

export type Sfx = "tap" | "correct" | "wrong" | "whoosh" | "fanfare" | "drumroll";
const SFX_NAMES: Sfx[] = ["tap", "correct", "wrong", "whoosh", "fanfare", "drumroll"];
const SFX_VOLUME: Record<Sfx, number> = { tap: 0.6, correct: 0.9, wrong: 0.9, whoosh: 0.6, fanfare: 1, drumroll: 0.9 };
const DUCK = 0.3;

const formatOf = (mime: string) => (mime.includes("mp4") ? "mp4" : "webm");

interface PlayOpts {
  questionId?: string;
  onStart?: (source: "creator" | "default") => void;
  onEnd?: () => void;
}

class AudioManager {
  muted = false;
  private unlocked = false;
  private listeners = new Set<() => void>();
  private sfxHowls: Partial<Record<Sfx, Howl>> = {};
  private defaultHowls: Record<string, Howl> = {};
  private failed = new Set<string>();
  private creatorHowls = new Map<string, Howl>();
  private creatorClips: ClipInfo[] = [];
  private useCreator = true;
  private lastPlayed: Partial<Record<string, string>> = {};
  private current: { stop: () => void } | null = null;
  private ducked = false;

  init() {
    if (typeof window === "undefined") return;
    this.muted = getMuted();
    Howler.mute(this.muted);
    this.emit();
  }
  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  private emit() { this.listeners.forEach((l) => l()); }

  /** Must be called from a user gesture (first tap). */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    try { (Howler.ctx as AudioContext | undefined)?.resume?.(); } catch {}
    try { window.speechSynthesis?.speak(new SpeechSynthesisUtterance("")); } catch {}
    this.loadSfx();
  }

  setMuted(m: boolean) {
    this.muted = m;
    saveMuted(m);
    Howler.mute(m);
    if (m) { try { window.speechSynthesis?.cancel(); } catch {} }
    this.emit();
  }

  private loadSfx() {
    SFX_NAMES.forEach((n) => {
      if (this.sfxHowls[n]) return;
      const h = new Howl({ src: [`/sounds/${n}.mp3`], volume: SFX_VOLUME[n], preload: true });
      h.on("loaderror", () => this.failed.add("sfx:" + n)); // missing file → silently skip
      this.sfxHowls[n] = h;
    });
  }

  /** Preload default voices + all of the creator's clips so there is no delay later. */
  preload(clips: ClipInfo[], useCreator: boolean) {
    this.loadSfx();
    this.useCreator = useCreator;
    this.creatorClips = useCreator ? clips : [];
    this.creatorClips.forEach((c) => {
      if (this.creatorHowls.has(c.id)) return;
      this.creatorHowls.set(c.id, new Howl({ src: [c.url], format: [formatOf(c.mime_type)], html5: true, preload: true }));
    });
    Object.values(DEFAULT_VOICES).flat().forEach((l) => {
      if (this.defaultHowls[l.file]) return;
      const h = new Howl({ src: [`/sounds/voices/${l.file}.mp3`], preload: true });
      h.on("loaderror", () => this.failed.add("voice:" + l.file));
      this.defaultHowls[l.file] = h;
    });
  }

  sfx(name: Sfx) {
    const h = this.sfxHowls[name];
    if (!h || this.failed.has("sfx:" + name)) return;
    h.volume(SFX_VOLUME[name] * (this.ducked ? DUCK : 1));
    h.play();
  }

  private setDuck(on: boolean) {
    this.ducked = on;
    SFX_NAMES.forEach((n) => this.sfxHowls[n]?.volume(SFX_VOLUME[n] * (on ? DUCK : 1)));
  }

  stopVoice() {
    this.current?.stop();
    this.current = null;
    this.setDuck(false);
  }

  /** Pick an item that is not the one played last time for this pool. */
  private pick<T extends { key: string }>(pool: T[], poolKey: string): T {
    const last = this.lastPlayed[poolKey];
    const candidates = pool.length > 1 ? pool.filter((p) => p.key !== last) : pool;
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    this.lastPlayed[poolKey] = choice.key;
    return choice;
  }

  /** Play a voice reaction: creator's clip (per-question → generic) → default file → speech synthesis. */
  playVoice(event: VoiceEvent, opts: PlayOpts = {}) {
    this.stopVoice();
    const { questionId, onStart, onEnd } = opts;
    if (this.muted) { onEnd?.(); return; }

    // 1) Creator's voice
    if (this.useCreator) {
      const special = event === "wrong" && questionId ? this.creatorClips.filter((c) => c.kind === "wrong" && c.question_id === questionId) : [];
      const generic = this.creatorClips.filter((c) => c.kind === event && !c.question_id);
      const pool = special.length ? special : generic;
      if (pool.length) {
        const clip = this.pick(pool.map((c) => ({ key: c.id, c })), special.length ? "q:" + questionId : "creator:" + event).c;
        const h = this.creatorHowls.get(clip.id);
        if (h) {
          let done = false;
          const finish = () => { if (done) return; done = true; this.setDuck(false); this.current = null; onEnd?.(); };
          h.off("end").off("playerror").off("loaderror");
          h.once("end", finish);
          h.once("playerror", () => { finish(); this.playDefault(event, opts); });
          this.setDuck(true);
          this.current = { stop: () => { h.stop(); finish(); } };
          onStart?.("creator");
          h.play();
          return;
        }
      }
    }
    // 2) Default voices
    this.playDefault(event, opts);
  }

  private playDefault(event: VoiceEvent, { onStart, onEnd }: PlayOpts) {
    const line = this.pick(DEFAULT_VOICES[event].map((l) => ({ key: l.file, ...l })), "default:" + event);
    let done = false;
    const finish = () => { if (done) return; done = true; this.current = null; onEnd?.(); };
    const speak = () => {
      try {
        const synth = window.speechSynthesis;
        if (!synth || this.muted) return finish();
        synth.cancel();
        const u = new SpeechSynthesisUtterance(line.text);
        u.lang = SPEECH_LANG;
        u.rate = 1.05;
        u.pitch = 1.2;
        u.onend = finish;
        u.onerror = finish;
        this.current = { stop: () => { synth.cancel(); finish(); } };
        onStart?.("default");
        synth.speak(u);
      } catch { finish(); }
    };
    const h = this.defaultHowls[line.file];
    if (!h || this.failed.has("voice:" + line.file)) return speak();
    h.off("end").off("loaderror").off("playerror");
    h.once("end", finish);
    h.once("loaderror", speak);
    h.once("playerror", speak);
    this.current = { stop: () => { h.stop(); finish(); } };
    onStart?.("default");
    h.play();
  }
}

export const audio = new AudioManager();
if (typeof window !== "undefined") audio.init();

export function useMuted(): boolean {
  return useSyncExternalStore(audio.subscribe, () => audio.muted, () => false);
}
