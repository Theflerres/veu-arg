#!/usr/bin/env node
// ============================================================================
// CIFRAR AS SEÇÕES DA PARTE 2 — roda SÓ NA SUA MÁQUINA
// ============================================================================
// Lê o texto-fonte de cada seção com blob (parte2-fonte/<id>.json, fora do
// git), põe o canário da seção (parte2/canarios.json), completa com espaços
// até um múltiplo de 4 KB e cifra com a chave da fase para
// parte2-cifrado/<blob> (o nome opaco vem de parte2/secoes.json).
//
// Também acerta o campo `canario` dos arquivos em claro da fase A
// (parte2/claro/<id>.json).
//
// Seção com trava por resposta (modelo "data+resposta"): se o texto-fonte
// tiver `trava.resposta` preenchida, o script grava `trava.sha256` (hash da
// resposta) e troca `blocos` por `trava.blocos` = XOR+base64 do JSON dos
// blocos com a resposta (o mesmo esquema de src/app/cifra.ts) — a resposta em
// si nunca vai para o blob. Sem resposta, a caixa fica trancada (nenhuma chave
// abre) e os blocos não entram.
//
// Chaves: variáveis de ambiente PARTE2_KEY_B / PARTE2_KEY_C ou, se faltarem,
// parte2-fonte/CHAVES.local.json. A chave entra no openssl por ambiente
// (-pass env:), nunca pela linha de comando. Nada aqui imprime chaves.
//
// Uso: node scripts/cifrar-secoes.mjs [id ...]   (sem ids: todas)

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { BLOCO_PADDING, DIR_CIFRADO, DIR_CLARO, DIR_FONTE, OPENSSL_ARGS, canarios, config, nomeChave } from "./parte2.mjs";

const so = new Set(process.argv.slice(2));
const marcas = canarios();
const local = existsSync(join(DIR_FONTE, "CHAVES.local.json")) ? JSON.parse(readFileSync(join(DIR_FONTE, "CHAVES.local.json"), "utf8")) : {};
const xorB64 = (texto, chave) => {
  const k = Buffer.from(chave, "utf8");
  const b = Buffer.from(texto, "utf8");
  return Buffer.from(b.map((x, i) => x ^ k[i % k.length])).toString("base64");
};

mkdirSync(DIR_CIFRADO, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "parte2-"));
let falhou = false;
try {
  for (const s of config().secoes) {
    if (so.size && !so.has(s.id)) continue;
    const canario = marcas[s.id];
    if (!canario) { console.error(`✖ ${s.id}: sem canário em parte2/canarios.json`); falhou = true; continue; }

    if (s.fonte === "claro") {
      const arq = join(DIR_CLARO, `${s.id}.json`);
      const obj = JSON.parse(readFileSync(arq, "utf8"));
      if (obj.id !== s.id) throw new Error(`${arq}: id ${obj.id} ≠ ${s.id}`);
      if (obj.canario !== canario) { obj.canario = canario; writeFileSync(arq, JSON.stringify(obj, null, 2) + "\n"); }
      console.log(`  ${s.id}: em claro (fase ${s.fase}) · canário ok`);
      continue;
    }

    const fonte = join(DIR_FONTE, `${s.id}.json`);
    if (!existsSync(fonte)) { console.error(`✖ ${s.id}: falta parte2-fonte/${s.id}.json`); falhou = true; continue; }
    const obj = JSON.parse(readFileSync(fonte, "utf8"));
    if (obj.id !== s.id) throw new Error(`${fonte}: id ${obj.id} ≠ ${s.id}`);
    obj.canario = canario;
    if (obj.trava) {
      const resposta = (obj.trava.resposta || "").trim();
      const blocos = obj.blocos || [];
      obj.trava = resposta
        ? { sha256: createHash("sha256").update(resposta).digest("hex"), blocos: xorB64(JSON.stringify(blocos), resposta) }
        : { sha256: null };
      delete obj.blocos;
    }
    let texto = JSON.stringify(obj);
    const alvo = Math.ceil((Buffer.byteLength(texto) + 1) / BLOCO_PADDING) * BLOCO_PADDING;
    texto += " ".repeat(alvo - Buffer.byteLength(texto));

    const nome = nomeChave(s.fase);
    const chave = process.env[nome] || local[nome];
    if (!chave) { console.error(`✖ ${s.id}: falta a chave ${nome}`); falhou = true; continue; }
    const claro = join(tmp, "s.json");
    writeFileSync(claro, texto);
    execFileSync("openssl", ["enc", "-e", ...OPENSSL_ARGS, "-in", claro, "-out", resolve(DIR_CIFRADO, s.blob), "-pass", `env:${nome}`], {
      env: { ...process.env, [nome]: chave },
      stdio: ["ignore", "ignore", "pipe"],
    });
    rmSync(claro, { force: true });
    console.log(`  ${s.id}: cifrado (fase ${s.fase}, ${alvo} bytes antes da cifra) → parte2-cifrado/${s.blob}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
if (falhou) process.exit(1);
