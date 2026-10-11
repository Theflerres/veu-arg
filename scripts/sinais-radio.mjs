// ============================================================================
// SINAIS DO RÁDIO — datas de liberação (compartilhado)
// ============================================================================
// Usado por scripts/liberar-sinais.mjs (workflow, antes do build) e por
// scripts/check-debug-leaks.js (depois do build). As datas ficam em
// radio-cifrado/datas.json, no fuso America/Sao_Paulo.
//
// "Hoje" é a data atual em America/Sao_Paulo, ou DATA_SIMULADA (AAAA-MM-DD)
// quando o workflow é rodado à mão para teste.

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// As variáveis RADIO_DIR_* só existem para teste local (pastas temporárias).
export const DIR_CIFRADO = resolve(process.env.RADIO_DIR_CIFRADO || resolve(RAIZ, "radio-cifrado"));
export const DIR_RADIO = resolve(process.env.RADIO_DIR_SAIDA || resolve(RAIZ, "public", "sounds", "radio"));

// Parâmetros do openssl — IGUAIS aos de producao-sinais/cifrar_sinais.py.
// A senha entra só por variável de ambiente (-pass env:RADIO_KEY).
export const OPENSSL_ARGS = ["-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-md", "sha256"];

/** Data de hoje (AAAA-MM-DD) em America/Sao_Paulo, ou a simulada.
 *  `agora` só existe para teste (um instante fixo). */
export function hojeSP(env = process.env, agora = new Date()) {
  const sim = (env.DATA_SIMULADA || "").trim();
  if (sim) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sim) || Number.isNaN(Date.parse(`${sim}T00:00:00Z`))) {
      throw new Error(`DATA_SIMULADA inválida: use AAAA-MM-DD`);
    }
    return { data: sim, simulada: true };
  }
  const data = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
  return { data, simulada: false };
}

/** { "2": "2026-10-12", ... } de radio-cifrado/datas.json ({} se não existir). */
export function datasDosSinais() {
  const arq = resolve(DIR_CIFRADO, "datas.json");
  if (!existsSync(arq)) return {};
  return JSON.parse(readFileSync(arq, "utf8"));
}

/** Separa os sinais em liberados (data <= hoje) e bloqueados. */
export function situacao(hoje = hojeSP().data) {
  const liberados = [];
  const bloqueados = [];
  for (const [n, data] of Object.entries(datasDosSinais())) {
    (hoje >= data ? liberados : bloqueados).push({ n, data });
  }
  return { liberados, bloqueados };
}
