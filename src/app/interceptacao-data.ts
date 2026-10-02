// ============================================================================
// INTERCEPTAÇÃO AUSTIN → HUNTER — transcrição do evento raro
// ============================================================================
// Na tela, o corpo de cada fala aparece só em Morse (ver textoParaMorse) e
// nunca se decodifica sozinho; os rótulos de remetente ficam em texto limpo.
// A linha final (rodapé) também começa em Morse e se decodifica sozinha
// depois que a conversa inteira foi exibida.
//
// `pausaAntesMs`: silêncio antes da fala (vira reticências animadas na tela).
//
// O rótulo do Austin aparece censurado até a primeira fala do Hunter que diz
// o nome dele (ver REVELA_AUSTIN_EM) — dali em diante, "Austin:".
//
// Os textos ficam CIFRADOS no código (`cifra`), no mesmo esquema da tela da
// Sophia (EcoScreen.tsx): XOR dos bytes UTF-8 com os bytes de CHAVE, repetida
// em ciclo, e o resultado em base64. Aqui a chave mora no próprio código, então
// não é segredo de verdade — só impede ler a conversa direto no repositório ou
// no JS publicado. Para mudar uma fala, gere a cifra nova com:
//
//   node -e "const k=Buffer.from('blackout//teatro');const b=Buffer.from(process.argv[1]);console.log(Buffer.from(b.map((x,i)=>x^k[i%k.length])).toString('base64'))" "TEXTO NOVO"

const CHAVE = "blackout//teatro";

// XOR é a própria inversa: a mesma função cifra e decifra.
function decifra(cifra: string): string {
  const k = new TextEncoder().encode(CHAVE);
  const b = Uint8Array.from(atob(cifra), (c) => c.charCodeAt(0));
  for (let i = 0; i < b.length; i++) b[i] ^= k[i % k.length];
  return new TextDecoder().decode(b);
}

export interface FalaInterceptada {
  de: "austin" | "hunter";
  texto: string;
  pausaAntesMs?: number;
}

const FALAS_CIFRADAS: (Omit<FalaInterceptada, "texto"> & { cifra: string })[] = [
  { de: "austin", cifra: "KhkPFw4dWVRAQRAAQQIdDKHGQQYYGxQCThBUNRMREQYRA0EFCgMUBg9MGwhBAh0MocZP" },
  { de: "hunter", cifra: "JBkIQwobtt0PTlSmwAYEABAJQRUCHBwATl1UEA8HUhkHAAkMGE8WG0FHEQYIEB0cTA==" },
  {
    de: "austin",
    cifra:
      "TEJPEh4KVbeOXQIKExFNTycfEQYZDllURezVRRIRG08TGQAPSxkaF+yFVBQUEQBPBgUbBhlBVTBKXBcQDQQTQ0ICosAETxERWUYVRRURAE8WCUEAAw4YFUtAVAsOVB8KCwNBBwIcBhsB",
  },
  {
    de: "hunter",
    cifra: "MQlBFQQMtt4PQhFFAhwTAg0ZTUOoxlUEQF0FEARUEwMFA0EKBh8aBltOGhEEVBMMDQIVBggKAFoPfxsBBFQUDg4NE00=",
  },
  {
    de: "austin",
    cifra:
      "LR9BAAQCBQFbThAKExEBTwdMAEMFAAYHTg8GAAURUg4MCAAOSw4SHUFLG0UEBwYdAwIJDEVPOgcPQxsCElQXHBavwgxLGhgVD00VAhQascgDTAIMBh8ZEVtOVIfh4FIOQq/bDQIMFFRMQB0WAFQDGgdMQwUKFVUHSkEADAUbUE8MA0EODgYaVEtGBxYOVLHGQhkMAksCEBpcThMADFQAChIJFQoPDk9UDV8GChUbEQAOA0EZDh0aVEZBHQYIFRYAQEI=",
  },
  {
    de: "austin",
    cifra: "KhkPFw4dSlRqXACmwFQGGgYDQQEOAkpUYA8FEARUE08FCQ8XDk8BEUIPBRAEVBQOGAkTXA==",
    pausaAntesMs: 3200,
  },
  {
    de: "hunter",
    cifra:
      "IxkSFwIBWVRLSgcGDhoXDBYNQRcECxoHD0AHRQAEEx0HAAkMGE8RGw9DFQcOBhMbod8TCgRBVSJOQhsWQRIbDAMeQQYGTxcYTkwfChQAUh8NHkECBwgAGlwPEAwAB1w=",
    pausaAntesMs: 2600,
  },
  { de: "austin", cifra: "MgMTQxoatt4QDztFEAEXTwcfFaDKTxQXQEEAAAIRHAsNUw==" },
  {
    de: "hunter",
    cifra:
      "Ml9BBhgbttUPXxgEDxEYDgwIDkMKAxIBQk5UBg4dAQ5CCxMCBQsQWg9/GxYSHQQKDgEEDR8KVQRKXR0CDgcTQUIiosAETwYRRg8QDBsRAE8NTBAWqMVVEVdOAAQMERwbB0BBDgocVQdKDxtFEQYdGw0PDg8ETw8RXUBUAw4dUg4BBQ4NCgsaWgEBVAQNEwcCA0wCDAIcFFRKXACmwFQEBgwIDk0=",
    pausaAntesMs: 1800,
  },
  {
    de: "hunter",
    cifra:
      "LK/CDEsZGgEPWRsJFRUATxIeDkMHDhcbXU4AptIGGwBMTDERDgwcB0APBAQSBxMdQgIOQx8KFABdQFQEDwAXHExMMBYKAREbD1kbBqLeUhsHHgwKBQ4HVEAPBRAEVBccFgUXBhlPExVVShoBDlhSDhINBgJLCgYHTg8XCg8CFx0RDU9DJQYbE1rs3QhBBB0LB0wSAgkKB1RLQFQUFBFSCQMAAA4EHFUcQEURS0EwF08EAxMOCk8UGEhaGQRP",
    pausaAntesMs: 2200,
  },
];

export const INTERCEPTACAO_FALAS: FalaInterceptada[] = FALAS_CIFRADAS.map(({ cifra, ...f }) => ({
  ...f,
  texto: decifra(cifra),
}));

/** Índice da fala a partir da qual (inclusive) o rótulo do Austin aparece limpo. */
export const REVELA_AUSTIN_EM = INTERCEPTACAO_FALAS.findIndex(
  (f) => f.de === "hunter" && /\bAustin\b/.test(f.texto)
);

/** Linha final — em Morse até a conversa terminar, depois se decodifica sozinha. */
export const INTERCEPTACAO_RODAPE = decifra(
  "OS0iJjg8Ok4Pf0c4QZby+0IABAofGgcVD0wbCwcdAAIDCABDDgJVAEpCBApBBhcODg=="
);

// ── Morse ───────────────────────────────────────────────────────────────────
// Código internacional (ITU). Morse não tem acento: letras acentuadas viram a
// letra base (á → A, ç → C), para qualquer decodificador comum ler. Travessão
// vira hífen; colchete vira parêntese. Palavras separadas por " / ".

const MORSE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
  I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
  Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--",
  "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...",
  ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-",
  '"': ".-..-.", "$": "...-..-", "@": ".--.-.",
};

const EQUIVALENTES: Record<string, string> = { "—": "-", "–": "-", "[": "(", "]": ")", "“": '"', "”": '"' };

/** Código Morse de um caractere; espaço → "/"; sem equivalente → "". */
export function charParaMorse(ch: string): string {
  if (/\s/.test(ch)) return "/";
  const base = (EQUIVALENTES[ch] ?? ch).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  return MORSE[base] ?? "";
}

/** Texto → códigos Morse, um por caractere (vazios descartados). */
export function textoParaMorse(texto: string): string[] {
  return Array.from(texto, charParaMorse).filter(Boolean);
}
