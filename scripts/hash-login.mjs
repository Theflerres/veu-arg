// Gera o PBKDF2 da chave do login do Sistema Schrödinger (uso local).
//
//   node scripts/hash-login.mjs                 # sal novo, 600.000 iterações
//   node scripts/hash-login.mjs --iter 400000   # outro número de iterações
//   node scripts/hash-login.mjs --conferir      # só confere o config atual
//
// A chave é lida de parte2-fonte/CHAVES.local.json (campo LOGIN, fora do git)
// e nunca é impressa. O resultado (sal + hash) é gravado de volta nesse mesmo
// arquivo, em LOGIN_PBKDF2, e impresso no formato de src/schrodinger/config.ts.

import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DIR_FONTE, RAIZ } from "./parte2.mjs";

const ARQ = join(DIR_FONTE, "CHAVES.local.json");
const chaves = JSON.parse(readFileSync(ARQ, "utf8"));
const chave = chaves.LOGIN;
if (!chave) {
  console.error(`Sem o campo LOGIN em ${ARQ}.`);
  process.exit(1);
}

const args = process.argv.slice(2);
const deriva = (sal, iter) => pbkdf2Sync(chave, sal, iter, 32, "sha256");

if (args.includes("--conferir")) {
  const cfg = readFileSync(join(RAIZ, "src/schrodinger/config.ts"), "utf8");
  const m = cfg.match(/iteracoes:\s*([\d_]+),\s*sal:\s*"([0-9a-f]+)",\s*hash:\s*"([0-9a-f]+)"/);
  if (!m) {
    console.error("CHAVE_LOGIN não encontrada no config.");
    process.exit(1);
  }
  const ok = timingSafeEqual(deriva(Buffer.from(m[2], "hex"), Number(m[1].replace(/_/g, ""))), Buffer.from(m[3], "hex"));
  console.log(ok ? "config confere com a chave local" : "config NÃO confere com a chave local");
  process.exit(ok ? 0 : 1);
}

const i = args.indexOf("--iter");
const iteracoes = i >= 0 ? Number(args[i + 1]) : 600_000;
if (!Number.isInteger(iteracoes) || iteracoes < 100_000) {
  console.error("--iter precisa ser um inteiro >= 100000");
  process.exit(1);
}
const sal = randomBytes(16);
const t0 = performance.now();
const hash = deriva(sal, iteracoes);
const ms = Math.round(performance.now() - t0);

chaves.LOGIN_PBKDF2 = { alg: "PBKDF2-SHA256", iteracoes, sal: sal.toString("hex"), hash: hash.toString("hex") };
writeFileSync(ARQ, JSON.stringify(chaves, null, 2) + "\n");

console.log(`// ${iteracoes} iterações · ${ms} ms no node · gravado em LOGIN_PBKDF2 de ${ARQ}`);
console.log(`export const CHAVE_LOGIN: HashPbkdf2 = {
  alg: "PBKDF2-SHA256",
  iteracoes: ${iteracoes.toLocaleString("en-US").replace(/,/g, "_")},
  sal: "${sal.toString("hex")}",
  hash: "${hash.toString("hex")}",
};`);
