// ============================================================================
// SISTEMA SCHRÖDINGER — configuração (um lugar só)
// ============================================================================
// Datas: TODAS em parte2/secoes.json (transição e abertura de cada seção).
// Aqui ficam só os ajustes do próprio site.

import SECOES from "../../parte2/secoes.json";
import type { HashPbkdf2 } from "./chave";

/** A partir deste instante (hora do servidor, via hora-confiavel.ts) a raiz
 *  do site deixa de ser o P3 e vira o Sistema Schrödinger. */
export const DATA_TRANSICAO = Date.parse(SECOES.transicao);

/** PBKDF2-SHA256 da chave do login (sal aleatório + derivação de 256 bits).
 *  O código nunca guarda a chave: ela fica só em parte2-fonte/CHAVES.local.json
 *  (fora do git). Trocar a chave ou as iterações: edite LOGIN nesse arquivo e
 *  rode `node scripts/hash-login.mjs [--iter N]`; cole o bloco impresso aqui.
 *  Conferir: `node scripts/hash-login.mjs --conferir`. */
export const CHAVE_LOGIN: HashPbkdf2 = {
  alg: "PBKDF2-SHA256",
  iteracoes: 600_000,
  sal: "1e3de0fe0d313022c9179882c2ff0959",
  hash: "1965edabc0709464ca27d42b61227e47b5ab00560a876e95e3aadf4817231bd1",
};

/** Tempo mínimo do "Verificando…" (evita um piscar quando o cálculo é rápido). */
export const VERIFICANDO_MIN_MS = 300;

/** Miau do login: sorteio por visita. V3 fica reservada para eventos: ponha
 *  "v3" em MIAU_FORCADO para tocar só ela. */
export const MIAU_PESOS: Record<"v1" | "v2", number> = { v1: 0.7, v2: 0.3 };
export const MIAU_FORCADO: "v1" | "v2" | "v3" | null = null;
export const MIAU_ARQUIVOS = { v1: "miau-v1-sistema", v2: "miau-v2-glitch", v3: "miau-v3-corrompido" } as const;

/** Textos opcionais do login. Vazio = a linha não aparece. */
export const TEXTOS = {
  subtitulo: "",          // abaixo de "Sistema Schrödinger" no login
  no: "",                 // "Nó ____" no topo do login
  origem: "",             // "Conexão redirecionada · ____" no rodapé
  titular: "Hunter",
};

/** Atraso visual entre tentativas erradas (não há bloqueio real). */
export const ESPERA_ERRO_MS = 3000;
/** A partir de quantos erros aparece a linha do gato. */
export const ERROS_PARA_AVISO = 3;

/** Chaves de armazenamento (localStorage/sessionStorage). */
export const CHAVES = {
  mudo: "sch-mudo",
  transicao: "sch-transicao-vista",
  sessao: "sch-sessao",
  trava: "sch-trava-",
} as const;
