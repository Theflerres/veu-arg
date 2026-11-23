// ============================================================================
// MIAU DIGITAL — som do OBSERVAR (login)
// ============================================================================
// Arquivos em public/sounds/schrodinger/: miau-v{1,2,3}-*.ogg/.mp3 e o envelope
// de amplitude de cada um (.env.json, 60 amostras/s), que a animação usa sem
// AnalyserNode — e que continua valendo no mudo. Toca num <audio> comum.
//
// Sorteio por visita: V1 70% / V2 30% (config.ts). V3 só por MIAU_FORCADO.

import { useEffect, useState } from "react";
import { CHAVES, MIAU_ARQUIVOS, MIAU_FORCADO, MIAU_PESOS } from "./config";

export type Envelope = { fps: number; duracao: number; env: number[] };
type Var = keyof typeof MIAU_ARQUIVOS;

export const VARIACAO: Var = MIAU_FORCADO ?? (Math.random() < MIAU_PESOS.v1 ? "v1" : "v2");
const DIR = `${import.meta.env.BASE_URL}sounds/schrodinger/`;

// ── mudo (localStorage, com try/catch) ─────────────────────────────────────
const ouvintes = new Set<(m: boolean) => void>();
export function estaMudo(): boolean {
  try {
    return localStorage.getItem(CHAVES.mudo) === "1";
  } catch {
    return false;
  }
}
export function defineMudo(v: boolean) {
  try {
    localStorage.setItem(CHAVES.mudo, v ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (v && audio && !audio.paused) audio.pause();
  ouvintes.forEach((f) => f(v));
}
export function useMudo(): [boolean, (v: boolean) => void] {
  const [m, setM] = useState(estaMudo);
  useEffect(() => {
    ouvintes.add(setM);
    return () => void ouvintes.delete(setM);
  }, []);
  return [m, defineMudo];
}

// ── envelope ───────────────────────────────────────────────────────────────
let envelope: Envelope | null = null;
export function carregaEnvelope(): Promise<Envelope | null> {
  if (envelope) return Promise.resolve(envelope);
  return fetch(`${DIR}${MIAU_ARQUIVOS[VARIACAO]}.env.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((e: Envelope | null) => (envelope = e && Array.isArray(e.env) ? e : null))
    .catch(() => null);
}
export const envelopeAtual = () => envelope;

// ── áudio ──────────────────────────────────────────────────────────────────
let audio: HTMLAudioElement | null = null;
let falhou = false;
let destravado = false;

export function preparaAudio(): HTMLAudioElement | null {
  if (audio || falhou) return audio;
  try {
    audio = new Audio();
    audio.preload = "auto";
    const ext = audio.canPlayType('audio/ogg; codecs="vorbis"') ? "ogg" : "mp3";
    audio.addEventListener("error", () => (falhou = true));
    audio.src = `${DIR}${MIAU_ARQUIVOS[VARIACAO]}.${ext}`;
  } catch {
    falhou = true;
    audio = null;
  }
  return audio;
}

/** Chamar DENTRO do gesto (clique/Enter): Safari/iOS só deixam tocar depois
 *  se o primeiro play nasceu no gesto. Toca mudo e pausa na hora. */
export function destravaNoGesto() {
  const a = preparaAudio();
  if (!a || destravado || estaMudo()) return;
  a.muted = true;
  const p = a.play();
  const solta = () => {
    a.pause();
    a.muted = false;
  };
  if (p && typeof p.then === "function") p.then(() => ((destravado = true), solta()), solta);
  else solta();
}

/** Toca o miau agora. Devolve o <audio> se começou (o relógio da animação
 *  passa a seguir o tempo dele), ou null: aí a animação roda muda. */
export function tocaMiau(): HTMLAudioElement | null {
  const a = preparaAudio();
  if (!a || falhou || estaMudo() || a.readyState < 3) return null;
  try {
    a.currentTime = 0;
  } catch {
    /* ignore */
  }
  a.muted = false;
  const p = a.play();
  if (p && typeof p.catch === "function") p.catch(() => undefined);
  return a;
}
