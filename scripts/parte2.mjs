// ============================================================================
// PARTE 2 (Sistema Schrödinger) — datas de abertura das seções (compartilhado)
// ============================================================================
// Usado por scripts/cifrar-secoes.mjs (local), scripts/liberar-secoes.mjs
// (workflow, antes do build), scripts/parte2-precisa.mjs (checagem barata do
// cron de hora em hora) e scripts/check-debug-leaks.js (depois do build).
//
// Fonte única das datas: parte2/secoes.json (ISO com -03:00, America/Sao_Paulo).
// Conteúdo de cada seção:
//   • fonte "claro" (fase A) → parte2/claro/<id>.json, versionado em claro;
//   • blob                    → parte2-cifrado/<blob>, AES com a chave da fase
//                               (PARTE2_KEY_B, PARTE2_KEY_C), mesmos parâmetros
//                               do rádio (OPENSSL_ARGS de sinais-radio.mjs).
// O texto-fonte dos blobs fica em parte2-fonte/ (no .gitignore, só local).
//
// "Agora" = hora real, ou a simulada para teste:
//   PARTE2_DATA_SIMULADA = AAAA-MM-DD ou AAAA-MM-DDTHH:MM (hora de Brasília)
//   DATA_SIMULADA        = AAAA-MM-DD (a mesma do rádio) → fim daquele dia.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { RAIZ, OPENSSL_ARGS } from "./sinais-radio.mjs";

export { RAIZ, OPENSSL_ARGS };
export const ARQ_SECOES = resolve(RAIZ, "parte2", "secoes.json");
export const ARQ_CANARIOS = resolve(RAIZ, "parte2", "canarios.json");
export const DIR_CLARO = resolve(RAIZ, "parte2", "claro");
export const DIR_CIFRADO = resolve(RAIZ, "parte2-cifrado");
export const DIR_FONTE = resolve(RAIZ, "parte2-fonte");
export const DIR_LIBERADO = resolve(RAIZ, "src", "schrodinger", "liberado");
export const ARQ_LIBERADAS = resolve(RAIZ, "public", "liberadas.json");
/** O JSON de cada seção é completado com espaços até um múltiplo disto antes
 *  de cifrar: o tamanho do blob não denuncia o tamanho do conteúdo. */
export const BLOCO_PADDING = 4096;

export function config() {
  return JSON.parse(readFileSync(ARQ_SECOES, "utf8"));
}

export function canarios() {
  if (!existsSync(ARQ_CANARIOS)) return {};
  const { _leia, ...resto } = JSON.parse(readFileSync(ARQ_CANARIOS, "utf8"));
  return resto;
}

/** Instante "agora" em ms (real ou simulado). */
export function agoraParte2(env = process.env, real = Date.now()) {
  const p2 = (env.PARTE2_DATA_SIMULADA || "").trim();
  const radio = (env.DATA_SIMULADA || "").trim();
  const sim = p2 || radio;
  if (!sim) return { ms: real, simulada: false, rotulo: new Date(real).toISOString() };
  let iso;
  if (/^\d{4}-\d{2}-\d{2}$/.test(sim)) iso = `${sim}T23:59:59-03:00`;
  else if (p2 && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(sim)) iso = `${sim}:00-03:00`;
  else throw new Error("data simulada inválida: use AAAA-MM-DD (ou AAAA-MM-DDTHH:MM em PARTE2_DATA_SIMULADA)");
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error("data simulada inválida");
  return { ms, simulada: true, rotulo: iso };
}

/** Separa as seções em liberadas (abre <= agora) e fechadas. */
export function situacao(ms = agoraParte2().ms) {
  const liberadas = [];
  const fechadas = [];
  for (const s of config().secoes) (Date.parse(s.abre) <= ms ? liberadas : fechadas).push(s);
  return { liberadas, fechadas };
}

export const nomeChave = (fase) => `PARTE2_KEY_${fase}`;
