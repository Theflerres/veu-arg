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
const PARAMS = ["debug", "fase", "final", "codigo", "marco", "resetmarcos", "travar", "egg", "editor"];

// Ocorrências conhecidas e inofensivas, de código de terceiros. São apagadas
// do texto antes da varredura. Mantenha esta lista o mais curta possível:
// cada entrada é um ponto cego.
const PERMITIDOS = [
  /useDebugValue/g, // hook do próprio React, presente em todo bundle de produção
  // three.js (modo de inspeção do hub): API pública do WebGLRenderer,
  // renderer.debug.checkShaderErrors / renderer.debug.onShaderError.
  /\.debug(?=\.(?:checkShaderErrors|onShaderError)\b)/g,
  /\.debug=\{checkShaderErrors\b/g,
];

const PADROES = [
  // Palavra "debug" em qualquer forma: painel, ids (#debug-panel), debugARG...
  { nome: "debug", re: /debug/i },
  // Atalhos de console expostos em window
  { nome: "window.P3Terminal", re: /P3Terminal/ },
  { nome: "window.debugARG", re: /debugARG/ },
  { nome: "testarBloqueio()", re: /testarBloqueio/ },
  { nome: "window.testeInterceptacao", re: /testeInterceptacao/ },
  // Hub da Bott (src/app/bott-teste.ts): atalhos e chaves de teste.
  // window.testeBott inclui abrirHub, abelha, chat(n), nivel, estado, zerar, sigla, piscaSigla, noventaENove, inspecao.
  { nome: "window.testeBott", re: /testeBott/ },
  { nome: "aviso de testeBott.chat", re: /o chat só abre no site principal/ },
  { nome: "aviso de testeBott.chat (abelha)", re: /a abelha está na vez/ },
  { nome: "aviso de testeBott.sigla/piscaSigla", re: /a sigla só aparece no hub/ },
  { nome: "testeBott.noventaENove", re: /noventaENove/ },
  { nome: "aviso de testeBott.noventaENove", re: /a barra só existe no hub/ },
  { nome: "aviso de testeBott.inspecao", re: /o modo de inspe\S+ s\S+ existe no hub/ },
  { nome: "aviso de testeBott.inspecao (sem modelo)", re: /sem modelo 3D: coloque/ },
  { nome: "chave veu-bott-teto-teste", re: /teto-teste/ },
  { nome: "chave veu-bott-estado-teste", re: /estado-teste/ },
  { nome: "chave veu-bott-forca-nivel", re: /forca-nivel/ },
  { nome: "marcador [TEXTO A ENVIAR]", re: /TEXTO A ENVIAR/ },
  // Termos que não podem ir ao ar de jeito nenhum (o Ç pode sair escapado no JS)
  { nome: "Dott", re: /Dott/ },
  { nome: "TRAÇA", re: /TRA(?:Ç|\\u00c7|\\xc7|&#199;|&Ccedil;)A/i },
  // Parâmetros como aparecem em texto (logs, comentários): "?travar", "?final=1"...
  ...PARAMS.map((p) => ({ nome: `?${p}`, re: new RegExp(`\\?${p}\\b`) })),
  // ...e como aparecem depois de minificado: .get("travar"), .get('fase')
  ...PARAMS.map((p) => ({
    nome: `.get("${p}")`,
    re: new RegExp(`\\.get\\(\\s*["'\`]${p}["'\`]\\s*\\)`),
  })),
  // Source map anularia a minificação (ver build.sourcemap no vite.config.ts)
  { nome: "sourceMappingURL", re: /sourceMappingURL=/ },
  // Página de teste da inspeção 3D (inspect/index.html): só em DEV. O viewer
  // e o three.js vão ao ar no modo de inspeção do hub (pedaço baixado sob
  // demanda); a página de teste e o editor, não.
  { nome: "marca inspecao-teste", re: /inspecao-teste/ },
  // Editor de poses da inspeção (src/inspect/EditorPoses.tsx, ?editor=1): só em DEV.
  { nome: "marca editor-poses-teste", re: /editor-poses-teste/ },
];

// Termos que não podem existir em lugar nenhum do repositório — nem aqui,
// que também é público. Os padrões ficam em base64 e são procurados no texto
// do build normalizado (ver normaliza): sem acentos, sem escapes \uXXXX,
// \xXX e &#NNN;, tudo em maiúsculas. Assim uma variação com ou sem acento,
// ou escapada pelo minificador, também é pega.
const OCULTOS = [
  "U1VCU1RJVFVUQQ==",
  "XGJDT1BJQVM/XGI=",
  "XGJWRVJTQU8gQlxi",
  "VFdPXHMrVEhPVUdIVFM=",
  "Qk9STlxzK09GXHMrVFdP",
].map((b64, i) => ({
  nome: `termo oculto #${i + 1}`,
  re: new RegExp(Buffer.from(b64, "base64").toString("utf8"), "g"),
}));

function normaliza(texto) {
  return texto
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

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
  if (relative(DIST, arq).replaceAll("\\", "/").startsWith("inspect/")) {
    vazamentos.push({ padrao: "página inspect/", arquivo: rel, contexto: "página de inspeção publicada no build" });
  }
  if (!EXTENSOES.has(extname(arq))) continue;

  const texto = PERMITIDOS.reduce((t, re) => t.replace(re, ""), readFileSync(arq, "utf8"));
  for (const { nome, re } of PADROES) {
    const global = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    for (const m of texto.matchAll(global)) {
      vazamentos.push({ padrao: nome, arquivo: rel, contexto: trecho(texto, m.index, m[0].length) });
    }
  }
  const normalizado = normaliza(texto);
  for (const { nome, re } of OCULTOS) {
    for (const m of normalizado.matchAll(re)) {
      vazamentos.push({ padrao: nome, arquivo: rel, contexto: trecho(normalizado, m.index, m[0].length) });
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
