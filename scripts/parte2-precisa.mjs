#!/usr/bin/env node
// ============================================================================
// PARTE 2 — o cron de hora em hora precisa de build? (checagem barata)
// ============================================================================
// Não usa Secret nenhuma nem instala dependência. Compara as seções que já
// deveriam estar abertas (parte2/secoes.json + hora atual) com o que o site
// publicado diz ter liberado (<site>/liberadas.json). Se falta alguma, ou se
// não deu para ler o arquivo publicado, responde build=true.
//
// Saída: escreve `build=true|false` em $GITHUB_OUTPUT (ou só imprime, local).
// Uso: node scripts/parte2-precisa.mjs [url-do-site]

import { appendFileSync } from "node:fs";
import { agoraParte2, situacao } from "./parte2.mjs";

const SITE = (process.argv[2] || process.env.PARTE2_SITE || "https://theflerres.github.io/veu-arg/").replace(/\/?$/, "/");
const { ms } = agoraParte2();
const devidas = situacao(ms).liberadas.map((s) => s.id);

let publicadas = null;
try {
  const resp = await fetch(`${SITE}liberadas.json?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (resp.ok) publicadas = (await resp.json()).ids ?? null;
} catch {
  publicadas = null;
}

const faltam = publicadas ? devidas.filter((id) => !publicadas.includes(id)) : devidas;
const build = publicadas === null || faltam.length > 0;
console.log(`devidas: ${devidas.join(", ") || "nenhuma"} · publicadas: ${publicadas ? publicadas.join(", ") || "nenhuma" : "(não li)"} · build=${build}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `build=${build}\n`);
