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

import {
  BOTT_ABERTURA,
  CAMADA_FINAL_ATIVA,
  ESTADO_MUNDO,
  PROGRESSO_B,
  PROGRESSO_B_DIAS,
  VERMELHO_MAX_POR_DIA,
  VERMELHO_MAX_POR_VISITA,
  textosDoSlot,
  type EstadoMundo,
  type SlotId,
} from "./bott-data";
import { agora, horaSP } from "./hora-confiavel";

export const HUB_URL = `${import.meta.env.BASE_URL}bott/`;

export const CHAVES = {
  nivel: "veu-bott-nivel",
  visitas: "veu-bott-visitas",
  abelha: "veu-bott-abelha",
  chatN: "veu-bott-chat-n", // aparições do chat do terminal desde BOTT_ABERTURA
  chatVistos: "veu-bott-chat-vistos", // variantes de deslize já mostradas
  log: "veu-bott-log",
  progressoB: "veu-bott-pb",
  cena99: "veu-bott-cena99", // { vista, dia, vezes } da cena do 99%
  /** Gatilho do nível 3: gravado pelo chat do terminal ao terminar uma variante de deslize. */
  gatilho3: "veu-bott-g3",
} as const;

/** Chaves de teste — só existem em `npm run dev` (ver bott-teste.ts). */
export const CHAVES_DEV = import.meta.env.DEV
  ? { estado: "veu-bott-estado-teste", forca: "veu-bott-forca-nivel", teto: "veu-bott-teto-teste" }
  : { estado: "", forca: "", teto: "" };

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

const DIA_MS = 24 * 60 * 60 * 1000;
const ULTIMO_B = PROGRESSO_B.degraus.length - 1;

// Peso de cada dia na subida do teto: sequência fixa (mesma para todos), com
// PROGRESSO_B.diasParados dos dias em zero. O último dia nunca é zero, para o
// teto só chegar ao fim no dia PROGRESSO_B_DIAS.
const PESOS_DIAS: number[] = (() => {
  let a = PROGRESSO_B.semente >>> 0;
  const aleatorio = () => {
    // mulberry32
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: PROGRESSO_B_DIAS }, (_, i) => {
    const r = aleatorio();
    if (i < PROGRESSO_B_DIAS - 1 && r < PROGRESSO_B.diasParados) return 0;
    return 0.4 + r;
  });
})();
const PESO_TOTAL = PESOS_DIAS.reduce((s, p) => s + p, 0);

/** Dias inteiros desde BOTT_ABERTURA pela hora confiável (0 = dia da abertura). */
export function diaDoProgressoB(ms: number = agora()): number {
  return Math.max(0, Math.floor((ms - BOTT_ABERTURA) / DIA_MS));
}

/** Teto (%) do dia `d`: PROGRESSO_B.tetoInicial no dia 0, 99 a partir do dia PROGRESSO_B_DIAS. */
export function tetoPercentual(d: number): number {
  if (d >= PROGRESSO_B_DIAS) return PROGRESSO_B.degraus[ULTIMO_B];
  const subida = PESOS_DIAS.slice(0, d).reduce((s, p) => s + p, 0) / PESO_TOTAL;
  const ini = PROGRESSO_B.tetoInicial;
  return ini + (PROGRESSO_B.degraus[ULTIMO_B] - ini) * subida;
}

/** Índice do maior degrau permitido hoje. */
export function tetoProgressoB(): number {
  if (import.meta.env.DEV && le(CHAVES_DEV.teto) === "1") return ULTIMO_B;
  const teto = tetoPercentual(diaDoProgressoB());
  let i = 0;
  while (i < ULTIMO_B && PROGRESSO_B.degraus[i + 1] <= teto) i++;
  return i;
}

/** Degrau exibido: o guardado, limitado pelo teto do dia. */
export function leProgressoB(): number {
  const guardado = Math.floor(leNumero(CHAVES.progressoB, PROGRESSO_B.inicial));
  return Math.max(0, Math.min(tetoProgressoB(), guardado, ULTIMO_B));
}

/**
 * Um passo: sobe um degrau (até o teto do dia) ou, às vezes, recua um. No
 * último degrau não recua: o 99% fica travado (o teto do dia continua
 * valendo, via leProgressoB). Devolve o novo índice.
 */
export function avancaProgressoB(): number {
  const atual = leProgressoB();
  const podeRecuar = atual > 0 && atual < ULTIMO_B;
  const n =
    podeRecuar && Math.random() < PROGRESSO_B.chanceRecuo ? atual - 1 : Math.min(tetoProgressoB(), atual + 1);
  grava(CHAVES.progressoB, String(n));
  return n;
}

/** Só em dev (testeBott.noventaENove): ignora o teto e põe a barra no último degrau. */
export function forcaUltimoProgressoB() {
  if (import.meta.env.DEV) {
    grava(CHAVES_DEV.teto, "1");
    grava(CHAVES.progressoB, String(ULTIMO_B));
  }
}

export function ultimoProgressoB(): number {
  return ULTIMO_B;
}

// ── Cena do 99% ─────────────────────────────────────────────────────────────

interface RegistroCena {
  vista: boolean;
  dia: string; // AAAA-MM-DD no horário de Brasília
  vezes: number; // cenas nesse dia
}

let cenasNestaVisita = 0;

function hojeSP(): string {
  const h = horaSP();
  return `${h.ano}-${String(h.mes).padStart(2, "0")}-${String(h.dia).padStart(2, "0")}`;
}

function leCena(): RegistroCena {
  try {
    const r = JSON.parse(le(CHAVES.cena99) ?? "null") as Partial<RegistroCena> | null;
    return {
      vista: r?.vista === true,
      dia: typeof r?.dia === "string" ? r.dia : "",
      vezes: typeof r?.vezes === "number" ? r.vezes : 0,
    };
  } catch {
    return { vista: false, dia: "", vezes: 0 };
  }
}

/** O visitante já viu a cena alguma vez? */
export function cena99Vista(): boolean {
  return leCena().vista;
}

/** Ainda cabe uma cena nesta visita e hoje? */
export function cena99Disponivel(): boolean {
  if (cenasNestaVisita >= VERMELHO_MAX_POR_VISITA) return false;
  const r = leCena();
  return r.dia !== hojeSP() || r.vezes < VERMELHO_MAX_POR_DIA;
}

export function registraCena99() {
  cenasNestaVisita++;
  const r = leCena();
  const hoje = hojeSP();
  grava(CHAVES.cena99, JSON.stringify({ vista: true, dia: hoje, vezes: r.dia === hoje ? r.vezes + 1 : 1 }));
}
