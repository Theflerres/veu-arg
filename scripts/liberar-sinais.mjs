#!/usr/bin/env node
// ============================================================================
// LIBERAÇÃO DOS SINAIS DO RÁDIO — roda no workflow, ANTES do build
// ============================================================================
// Para cada sinal de radio-cifrado/datas.json cuja data (America/Sao_Paulo)
// já chegou, decifra radio-cifrado/sN.bin para public/sounds/radio/sinal-N.mp3
// (caminho no .gitignore: o decifrado só existe dentro do runner). Sinais
// ainda não liberados não são decifrados nem copiados.
//
// A chave vem SÓ da variável de ambiente RADIO_KEY (no workflow, do Secret),
// e chega ao openssl também por ambiente (-pass env:RADIO_KEY), nunca pela
// linha de comando. Nada aqui imprime a chave nem o conteúdo dos arquivos.
//
// Sem RADIO_KEY: avisa e sai com sucesso (o site publica sem os sinais novos).
// Blob ausente: avisa e pula. Chave errada / blob corrompido: FALHA (não
// publica um sinal quebrado; o site no ar continua como estava).
//
// Teste: DATA_SIMULADA=AAAA-MM-DD faz de conta que hoje é essa data.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { DIR_CIFRADO, DIR_RADIO, OPENSSL_ARGS, hojeSP, situacao } from "./sinais-radio.mjs";

const aviso = (msg) => console.log(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : `⚠ ${msg}`);

const { data: hoje, simulada } = hojeSP();
const { liberados, bloqueados } = situacao(hoje);
console.log(`Sinais do rádio — hoje (America/Sao_Paulo): ${hoje}${simulada ? " [DATA SIMULADA]" : ""}`);
console.log(`  liberados: ${liberados.map((s) => s.n).join(", ") || "nenhum"}`);
console.log(`  ainda não: ${bloqueados.map((s) => `${s.n} (${s.data})`).join(", ") || "nenhum"}`);

if (!liberados.length) process.exit(0);

if (!process.env.RADIO_KEY) {
  aviso("RADIO_KEY não definida (Secret ausente): os sinais liberados NÃO foram decifrados. O build segue sem eles.");
  process.exit(0);
}

mkdirSync(DIR_RADIO, { recursive: true });
let falhou = false;
for (const { n } of liberados) {
  const blob = resolve(DIR_CIFRADO, `s${n}.bin`);
  const saida = resolve(DIR_RADIO, `sinal-${n}.mp3`);
  if (!existsSync(blob)) {
    aviso(`radio-cifrado/s${n}.bin não existe: sinal ${n} pulado.`);
    continue;
  }
  try {
    execFileSync("openssl", ["enc", "-d", ...OPENSSL_ARGS, "-in", blob, "-out", saida, "-pass", "env:RADIO_KEY"], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    console.log(`  sinal ${n}: decifrado`);
  } catch {
    // stderr do openssl não é repassado: só diz que não decifrou
    rmSync(saida, { force: true });
    console.error(`✖ sinal ${n}: não decifrou (chave errada ou arquivo corrompido)`);
    falhou = true;
  }
}
if (falhou) process.exit(1);
