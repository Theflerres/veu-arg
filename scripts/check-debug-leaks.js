#!/usr/bin/env node
// ============================================================================
// CHECAGEM DE VAZAMENTO DE DEBUG — roda depois do `vite build`
// ============================================================================
// Varre dist/ atrás de qualquer rastro das ferramentas de debug/teste que
// deveriam existir só em `npm run dev` (ver DEBUG-AUDIT.md). Achou alguma
// coisa: imprime o padrão, o arquivo e um trecho em volta, e sai com código 1
// — o que derruba `npm run build:check` e, com ele, o deploy.
//
// Para cobrir um parâmetro/atalho novo, acrescente uma linha em PADROES.
// Uso: node scripts/check-debug-leaks.js [pasta]   (padrão: dist)

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, resolve } from "node:path";

const DIST = resolve(process.argv[2] ?? "dist");

// Parâmetros de URL que ligam algo especial no countdown/site.
const PARAMS = ["debug", "fase", "final", "codigo", "marco", "resetmarcos", "travar", "egg"];

// Ocorrências conhecidas e inofensivas, de código de terceiros. São apagadas
// do texto antes da varredura. Mantenha esta lista o mais curta possível:
// cada entrada é um ponto cego.
const PERMITIDOS = [
  /useDebugValue/g, // hook do próprio React, presente em todo bundle de produção
];

const PADROES = [
  // Palavra "debug" em qualquer forma: painel, ids (#debug-panel), debugARG...
  { nome: "debug", re: /debug/i },
  // Atalhos de console expostos em window
  { nome: "window.P3Terminal", re: /P3Terminal/ },
  { nome: "window.debugARG", re: /debugARG/ },
  { nome: "testarBloqueio()", re: /testarBloqueio/ },
  // Parâmetros como aparecem em texto (logs, comentários): "?travar", "?final=1"...
  ...PARAMS.map((p) => ({ nome: `?${p}`, re: new RegExp(`\\?${p}\\b`) })),
  // ...e como aparecem depois de minificado: .get("travar"), .get('fase')
  ...PARAMS.map((p) => ({
    nome: `.get("${p}")`,
    re: new RegExp(`\\.get\\(\\s*["'\`]${p}["'\`]\\s*\\)`),
  })),
  // Source map anularia a minificação (ver build.sourcemap no vite.config.ts)
  { nome: "sourceMappingURL", re: /sourceMappingURL=/ },
];

const EXTENSOES = new Set([".js", ".mjs", ".cjs", ".html", ".css"]);

function arquivos(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

function trecho(texto, indice, tamanho) {
  const ini = Math.max(0, indice - 40);
  const fim = Math.min(texto.length, indice + tamanho + 40);
  return texto.slice(ini, fim).replace(/\s+/g, " ");
}

if (!existsSync(DIST)) {
  console.error(`✖ ${relative(process.cwd(), DIST) || DIST}/ não existe — rode o build antes.`);
  process.exit(1);
}

const todos = arquivos(DIST);
const vazamentos = [];

for (const arq of todos) {
  const rel = relative(process.cwd(), arq).replaceAll("\\", "/");

  if (extname(arq) === ".map") {
    vazamentos.push({ padrao: "arquivo .map", arquivo: rel, contexto: "source map publicado junto do build" });
    continue;
  }
  if (!EXTENSOES.has(extname(arq))) continue;

  const texto = PERMITIDOS.reduce((t, re) => t.replace(re, ""), readFileSync(arq, "utf8"));
  for (const { nome, re } of PADROES) {
    const global = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    for (const m of texto.matchAll(global)) {
      vazamentos.push({ padrao: nome, arquivo: rel, contexto: trecho(texto, m.index, m[0].length) });
    }
  }
}

if (vazamentos.length) {
  console.error(`\n✖ ${vazamentos.length} vazamento(s) de debug no build de produção:\n`);
  for (const v of vazamentos) {
    console.error(`  [${v.padrao}] em ${v.arquivo}`);
    console.error(`      …${v.contexto}…\n`);
  }
  console.error("Tudo que é debug/teste precisa estar dentro de `if (import.meta.env.DEV) { ... }`.");
  console.error("Deploy bloqueado. Detalhes em DEBUG-AUDIT.md.\n");
  process.exit(1);
}

const varridos = todos.filter((a) => EXTENSOES.has(extname(a))).length;
console.log(`✔ check-debug-leaks: nenhum vazamento em ${varridos} arquivo(s) de ${relative(process.cwd(), DIST) || DIST}/`);
