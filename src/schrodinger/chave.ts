// Conferência da chave do login com PBKDF2-SHA256 (Web Crypto).
//
// O código guarda só o sal e o resultado da derivação (256 bits), nunca a
// chave. Com muitas iterações, cada palpite custa caro também para quem
// tentar adivinhar offline a partir do JS publicado.
//
// Gerar (lê a chave de parte2-fonte/CHAVES.local.json, fora do git):
//   node scripts/hash-login.mjs
//
// Sem crypto.subtle (página aberta fora de https/localhost, navegador muito
// antigo) não há como conferir: o formulário avisa e nunca aceita.

export type HashPbkdf2 = {
  alg: "PBKDF2-SHA256";
  iteracoes: number;
  /** sal aleatório, 16 bytes em hex */
  sal: string;
  /** derivação de 256 bits em hex */
  hash: string;
};

export function temCryptoSeguro(): boolean {
  try {
    return typeof crypto !== "undefined" && !!crypto.subtle && typeof crypto.subtle.deriveBits === "function";
  } catch {
    return false;
  }
}

function deHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** true se `valor` deriva no mesmo hash. Sem crypto.subtle ou com erro, false. */
export async function conferePbkdf2(valor: string, h: HashPbkdf2): Promise<boolean> {
  if (!temCryptoSeguro()) return false;
  try {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(valor), "PBKDF2", false, ["deriveBits"]);
    const bits = new Uint8Array(
      await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: deHex(h.sal), iterations: h.iteracoes }, base, 256),
    );
    const alvo = deHex(h.hash);
    if (bits.length !== alvo.length) return false;
    let dif = 0;
    for (let i = 0; i < bits.length; i++) dif |= bits[i] ^ alvo[i];
    return dif === 0;
  } catch {
    return false;
  }
}
