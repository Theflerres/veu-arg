// ============================================================================
// CHAT DO TERMINAL — variantes de deslize
// ============================================================================
// Entram no mesmo sorteio dos diálogos de chat-dialogues.ts, com peso
// CHAT_PESO_DESLIZE (bott-data.ts). Regras em components/ChatWidget.tsx:
// só depois de BOTT_ABERTURA (hora confiável), só para quem já viu pelo
// menos uma aparição do chat depois dessa data, e cada variante no máximo
// uma vez por visitante. Terminada até o fim, grava o gatilho do nível 3.
//
//   sender  "Bott" | "P3LUCHE" (os mesmos nomes de chat-dialogues.ts)
//   tipo    "normal" (padrão) | "deslize"
//   texto   CIFRADO (ver abaixo); "" = ainda sem texto
//   delay   "digitação" antes da fala, em ms (depois de um deslize, a
//           espera cai para CHAT_RESPOSTA_RAPIDA_MS)
//
// Variante com alguma linha sem texto não dispara em produção; em
// `npm run dev` as linhas vazias aparecem como "[TEXTO A ENVIAR]".
//
// Para cifrar um texto novo (mesmo esquema de cifra.ts):
//
//   node -e "const k=Buffer.from('favo:canal/0731');const b=Buffer.from(process.argv[1]);console.log(Buffer.from(b.map((x,i)=>x^k[i%k.length])).toString('base64'))" "TEXTO"

import type { ChatDialogue, ChatMessage } from "./chat-dialogues";
import { decifraTexto } from "./cifra";

const CHAVE_CHAT = "favo:canal/0731";

interface LinhaCifrada {
  sender: "Bott" | "P3LUCHE";
  tipo?: ChatMessage["tipo"];
  texto: string;
  delay: number;
}

export interface VarianteDeslize {
  id: string;
  linhas: LinhaCifrada[];
}

export const CHAT_VARIANTES_DESLIZE: VarianteDeslize[] = [
  {
    id: "chat-d1",
    linhas: [
      { sender: "Bott", texto: "", delay: 2500 },
      { sender: "P3LUCHE", texto: "", delay: 2200 },
      { sender: "Bott", tipo: "deslize", texto: "", delay: 3200 },
      { sender: "P3LUCHE", texto: "", delay: 2000 },
    ],
  },
  {
    id: "chat-d2",
    linhas: [
      { sender: "P3LUCHE", texto: "", delay: 2000 },
      { sender: "Bott", texto: "", delay: 2600 },
      { sender: "Bott", tipo: "deslize", texto: "", delay: 3000 },
      { sender: "P3LUCHE", texto: "", delay: 2000 },
    ],
  },
];

/** A variante como diálogo do chat, decifrada; null se não pode disparar (texto vazio, fora de dev). */
export function dialogoDaVariante(v: VarianteDeslize): ChatDialogue | null {
  if (!v.linhas.length) return null;
  if (v.linhas.some((l) => !l.texto) && !import.meta.env.DEV) return null;
  return {
    id: v.id,
    messages: v.linhas.map((l) => ({
      sender: l.sender,
      tipo: l.tipo ?? "normal",
      delay: l.delay,
      text: l.texto ? decifraTexto(l.texto, CHAVE_CHAT) : import.meta.env.DEV ? "[TEXTO A ENVIAR]" : "",
    })),
  };
}
