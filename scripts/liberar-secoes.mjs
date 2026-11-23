#!/usr/bin/env node
// ============================================================================
// LIBERAÇÃO DAS SEÇÕES DA PARTE 2 — roda no workflow, ANTES do build
// ============================================================================
// Para cada seção de parte2/secoes.json cuja hora de abertura já chegou:
//   • fonte "claro" → copia parte2/claro/<id>.json;
//   • blob          → decifra parte2-cifrado/<blob> com PARTE2_KEY_<fase>;
// e grava em src/schrodinger/liberado/<id>.json (no .gitignore). O site só
// importa o que estiver nessa pasta: seção fechada nem chega ao bundle e
// aparece como RECONECTANDO. A pasta é apagada e refeita a cada execução.
//
// Também grava public/liberadas.json ({ ids, gerado }): o site consulta esse
// arquivo quando uma contagem zera, e scripts/parte2-precisa.mjs compara com a
// versão publicada para decidir se o cron de hora em hora precisa de build.
//
// Sem a chave de uma fase: avisa e segue sem aquelas seções. Chave errada ou
// blob corrompido: FALHA (não publica nada quebrado). Nada aqui imprime chaves
// nem conteúdo.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ARQ_LIBERADAS, DIR_CIFRADO, DIR_CLARO, DIR_LIBERADO, OPENSSL_ARGS, agoraParte2, canarios, nomeChave, situacao } from "./parte2.mjs";

const aviso = (msg) => console.log(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : `⚠ ${msg}`);
const { ms, simulada, rotulo } = agoraParte2();
const { liberadas, fechadas } = situacao(ms);
const marcas = canarios();
console.log(`Parte 2 — agora: ${rotulo}${simulada ? " [DATA SIMULADA]" : ""}`);
console.log(`  vencidas: ${liberadas.map((s) => s.id).join(", ") || "nenhuma"}`);
console.log(`  fechadas: ${fechadas.map((s) => `${s.id} (${s.abre})`).join(", ") || "nenhuma"}`);

rmSync(DIR_LIBERADO, { recursive: true, force: true });
mkdirSync(DIR_LIBERADO, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "parte2-"));
const ok = [];
let falhou = false;

function grava(s, texto) {
  const obj = JSON.parse(texto); // o padding é só espaço: JSON.parse ignora
  if (obj.id !== s.id) throw new Error(`id ${obj.id} ≠ ${s.id}`);
  if (marcas[s.id] && obj.canario !== marcas[s.id]) throw new Error("canário não confere (rode scripts/cifrar-secoes.mjs)");
  writeFileSync(join(DIR_LIBERADO, `${s.id}.json`), JSON.stringify(obj));
  ok.push(s.id);
}

try {
  for (const s of liberadas) {
    try {
      if (s.fonte === "claro") {
        grava(s, readFileSync(join(DIR_CLARO, `${s.id}.json`), "utf8"));
        console.log(`  ${s.id}: em claro`);
        continue;
      }
      const nome = nomeChave(s.fase);
      if (!process.env[nome]) { aviso(`${nome} não definida (Secret ausente): seção ${s.id} continua RECONECTANDO.`); continue; }
      const blob = resolve(DIR_CIFRADO, s.blob);
      if (!existsSync(blob)) { aviso(`parte2-cifrado/${s.blob} não existe: seção ${s.id} pulada.`); continue; }
      const saida = join(tmp, "s.json");
      execFileSync("openssl", ["enc", "-d", ...OPENSSL_ARGS, "-in", blob, "-out", saida, "-pass", `env:${nome}`], {
        stdio: ["ignore", "ignore", "pipe"],
      });
      grava(s, readFileSync(saida, "utf8"));
      rmSync(saida, { force: true });
      console.log(`  ${s.id}: decifrada`);
    } catch (e) {
      // não repassa stderr do openssl nem o conteúdo
      console.error(`✖ seção ${s.id}: não liberou (${e instanceof SyntaxError ? "conteúdo inválido" : "chave errada, blob corrompido ou canário divergente"})`);
      falhou = true;
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

mkdirSync(resolve(ARQ_LIBERADAS, ".."), { recursive: true });
writeFileSync(ARQ_LIBERADAS, JSON.stringify({ ids: ok, gerado: new Date().toISOString() }) + "\n");
if (falhou) process.exit(1);
