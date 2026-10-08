// ============================================================================
// BOTT — progresso do visitante (localStorage) e gatilhos
// ============================================================================
// O GitHub Pages serve todos os repositórios do usuário na mesma origem
// (theflerres.github.io), e o localStorage é por origem: toda chave daqui
// começa com "veu-bott-" para não esbarrar em outro projeto.
//
// Escada (veu-bott-nivel = último degrau visto):
//   0  base
//   1  primeira visita ao hub depois de BOTT_ABERTURA
//   2  depois do 1, se o visitante já viu uma Interceptação
//   3  depois do 2, se o visitante já viu uma variante de deslize do chat até o fim (gatilhoNivel3)
//   4  camada final: depois do 3, com CAMADA_FINAL_ATIVA
// No máximo um degrau por visita.

import { BOTT_ABERTURA, CAMADA_FINAL_ATIVA, ESTADO_MUNDO, PROGRESSO_B, textosDoSlot, type EstadoMundo, type SlotId } from "./bott-data";

export const HUB_URL = `${import.meta.env.BASE_URL}bott/`;

export const CHAVES = {
  nivel: "veu-bott-nivel",
  visitas: "veu-bott-visitas",
  abelha: "veu-bott-abelha",
  chatN: "veu-bott-chat-n", // aparições do chat do terminal desde BOTT_ABERTURA
  chatVistos: "veu-bott-chat-vistos", // variantes de deslize já mostradas
  log: "veu-bott-log",
  progressoB: "veu-bott-pb",
  /** Gatilho do nível 3: gravado pelo chat do terminal ao terminar uma variante de deslize. */
  gatilho3: "veu-bott-g3",
} as const;

/** Chaves de teste — só existem em `npm run dev` (ver bott-teste.ts). */
export const CHAVES_DEV = import.meta.env.DEV
  ? { estado: "veu-bott-estado-teste", forca: "veu-bott-forca-nivel" }
  : { estado: "", forca: "" };

/** Contador da Interceptação (mesma chave de components/Interceptacao.tsx). */
const INTERCEPTACAO_KEY = "veu_interceptacao_v1";

function le(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function grava(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* quota / modo privado — vale só para esta aba */
  }
}

function leNumero(chave: string, padrao: number): number {
  const n = Number(le(chave));
  return le(chave) !== null && Number.isFinite(n) ? n : padrao;
}

// ── Visitas ─────────────────────────────────────────────────────────────────

/** Conta esta visita ao hub e devolve o total (1 = primeira). */
export function registraVisita(): number {
  const n = leNumero(CHAVES.visitas, 0) + 1;
  grava(CHAVES.visitas, String(n));
  return n;
}

// ── Escada ──────────────────────────────────────────────────────────────────

export const DEGRAUS: SlotId[] = ["nivel-1", "nivel-2", "nivel-3", "camada-final"];

export function leNivel(): number {
  return Math.max(0, Math.min(DEGRAUS.length, Math.floor(leNumero(CHAVES.nivel, 0))));
}

export function gravaNivel(n: number) {
  grava(CHAVES.nivel, String(n));
}

/** Marca o degrau como visto (nunca desce). */
export function concluiDegrau(id: SlotId) {
  const n = DEGRAUS.indexOf(id) + 1;
  if (n > 0 && n > leNivel()) gravaNivel(n);
}

export function interceptacaoVista(): boolean {
  try {
    const r = JSON.parse(le(INTERCEPTACAO_KEY) ?? "null") as { disparos?: unknown } | null;
    return typeof r?.disparos === "number" && r.disparos > 0;
  } catch {
    return false;
  }
}

/** Gatilho do nível 3 — o chat grava CHAVES.gatilho3 = "1" (marcaGatilhoNivel3). */
export function gatilhoNivel3(): boolean {
  return le(CHAVES.gatilho3) === "1";
}

export function marcaGatilhoNivel3() {
  grava(CHAVES.gatilho3, "1");
}

/** Degrau que esta visita deve mostrar, ou null. `agoraMs` = hora confiável. */
export function proximoDegrau(agoraMs: number): SlotId | null {
  if (import.meta.env.DEV) {
    const forcado = le(CHAVES_DEV.forca);
    if (forcado !== null) {
      try {
        localStorage.removeItem(CHAVES_DEV.forca);
      } catch {
        /* ignore */
      }
      return DEGRAUS[Number(forcado) - 1] ?? null;
    }
  }

  const n = leNivel();
  let id: SlotId | null = null;
  if (n === 0 && agoraMs >= BOTT_ABERTURA) id = "nivel-1";
  else if (n === 1 && interceptacaoVista()) id = "nivel-2";
  else if (n === 2 && gatilhoNivel3()) id = "nivel-3";
  else if (n === 3 && CAMADA_FINAL_ATIVA) id = "camada-final";
  // Slot sem texto: o degrau espera o texto chegar (não conta como visto).
  return id && textosDoSlot(id).length ? id : null;
}

// ── Estado do mundo ─────────────────────────────────────────────────────────

export function estadoMundo(): EstadoMundo {
  if (import.meta.env.DEV) {
    const e = le(CHAVES_DEV.estado);
    if (e === "desconhecido" || e === "nao-contaram" || e === "contaram") return e;
  }
  return ESTADO_MUNDO;
}

// ── Log persistido (revisões do P3) ─────────────────────────────────────────

export interface EntradaLog {
  em: number; // ms epoch, hora confiável
  msg: string;
}

const LOG_MAX = 12;

export function leLog(): { itens: EntradaLog[] } {
  try {
    const r = JSON.parse(le(CHAVES.log) ?? "null") as { itens?: unknown } | null;
    const itens = Array.isArray(r?.itens)
      ? (r.itens as EntradaLog[]).filter((e) => typeof e?.em === "number" && typeof e?.msg === "string")
      : [];
    return { itens };
  } catch {
    return { itens: [] };
  }
}

export function registraNoLog(e: EntradaLog) {
  const { itens } = leLog();
  grava(CHAVES.log, JSON.stringify({ itens: [...itens, e].slice(-LOG_MAX) }));
}

// ── Barra de progresso do DIAGNÓSTICO ─────────────────────────────────────────

export function leProgressoB(): number {
  return Math.max(
    0,
    Math.min(PROGRESSO_B.degraus.length - 1, Math.floor(leNumero(CHAVES.progressoB, PROGRESSO_B.inicial)))
  );
}

/** Sobe um degrau (nunca passa do último) e devolve o novo índice. */
export function avancaProgressoB(): number {
  const n = Math.min(PROGRESSO_B.degraus.length - 1, leProgressoB() + 1);
  grava(CHAVES.progressoB, String(n));
  return n;
}
