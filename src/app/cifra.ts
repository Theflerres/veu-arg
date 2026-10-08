// ============================================================================
// CIFRA — utilitários compartilhados
// ============================================================================
// Mesmo esquema da tela de reconhecimento (components/EcoScreen.tsx) e da
// Interceptação (interceptacao-data.ts), num lugar só para as telas novas:
//
//   • chave de acesso: o código guarda só o SHA-256 (hex) dela e compara
//     hashes (confereChave). Gerar o hash de uma chave nova:
//       node -e "console.log(require('crypto').createHash('sha256').update('CHAVE').digest('hex'))"
//
//   • textos: XOR dos bytes UTF-8 com os bytes da chave, repetida em ciclo, e
//     o resultado em base64 (decifraTexto). Gerar a cifra de um texto:
//       node -e "const k=Buffer.from('CHAVE');const b=Buffer.from(process.argv[1]);console.log(Buffer.from(b.map((x,i)=>x^k[i%k.length])).toString('base64'))" "TEXTO"
//
//   • arquivos (áudio): o mesmo XOR, byte a byte, sobre o arquivo inteiro
//     (decifraArquivo). O original nunca vai para public/ nem para o git —
//     fica em audio-original/ (no .gitignore). Gerar o .bin:
//       node -e "const fs=require('fs');const k=Buffer.from('CHAVE');const b=fs.readFileSync('audio-original/ARQUIVO.mp3');fs.writeFileSync('public/sounds/NOME.bin',Buffer.from(b.map((x,i)=>x^k[i%k.length])))"
//
// Não é criptografia forte: só impede ler o conteúdo direto no repositório
// ou no JS publicado.

/** SHA-256 em hex. Lança fora de contexto seguro (sem crypto.subtle). */
export async function sha256Hex(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** true se `valor` bate com o hash. Sem crypto.subtle, nunca bate. */
export async function confereChave(valor: string, hashHex: string): Promise<boolean> {
  try {
    return (await sha256Hex(valor)) === hashHex.toLowerCase();
  } catch {
    return false;
  }
}

/** XOR é a própria inversa: a mesma função cifra e decifra. Altera `bytes`. */
export function xorBytes(bytes: Uint8Array, chave: string): Uint8Array {
  const k = new TextEncoder().encode(chave);
  for (let i = 0; i < bytes.length; i++) bytes[i] ^= k[i % k.length];
  return bytes;
}

export function decifraTexto(cifra: string, chave: string): string {
  const b = Uint8Array.from(atob(cifra), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(xorBytes(b, chave));
}

/** Baixa e decifra um arquivo; devolve uma URL local (blob:), ou null. */
export async function decifraArquivo(url: string, chave: string, tipo = "audio/mpeg"): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const bytes = xorBytes(new Uint8Array(await resp.arrayBuffer()), chave);
    return URL.createObjectURL(new Blob([bytes], { type: tipo }));
  } catch {
    return null;
  }
}
