// ============================================================================
// APAGÃO — o site inteiro fora do ar, só o countdown disponível
// ============================================================================
// Módulo sem React, compartilhado pelo site (App.tsx), pelo hub (src/bott/),
// pela página de teste da inspeção e pelo countdown (timer/index.html). Quem
// decide é apagaoNoAr(agora): cada página passa a própria hora confiável
// (hora-confiavel.ts no site; o relógio do countdown lá).
//
// Encerrar antes da data: APAGAO_ATIVO = false e publicar.
// Em `npm run dev` o apagão vem LIGADO por padrão, independente da data e de
// APAGAO_ATIVO; testeApagao.desligar() desliga (ver registraTesteApagao).

import { APAGAO_TEMPOS } from "./apagao-tempos";

export const APAGAO_ATIVO = true;
/** O apagão termina sozinho neste instante (o mesmo alvo do countdown). */
export const APAGAO_ATE = new Date("2026-10-16T00:00:00-03:00");

// ── Tela ────────────────────────────────────────────────────────────────────
// A linha de abertura é digitada letra a letra, no silêncio; depois a fala
// aparece PALAVRA POR PALAVRA, cada uma no seu instante.
export const APAGAO_LINHA_ABERTURA = ">> 66 LUZES APAGADAS.";

/** A fala: uma entrada por linha, com as palavras e os tempos delas (s, a
 *  partir do início da voz em p3-apagao.mp3). `unissono` = trecho em que as
 *  duas vozes falam juntas (aparece com destaque). Os tempos valem também sem
 *  o áudio: aí a mesma sequência roda no relógio da página. */
export type PalavraApagao = { texto: string; inicio: number; fim: number; unissono: boolean };
export const APAGAO_FALA: { palavras: PalavraApagao[] }[] = APAGAO_TEMPOS;

/** "acumula": a linha se monta palavra a palavra e some quando a próxima
 *  começa. "uma-por-vez": só a palavra atual, grande e centralizada. */
export const APAGAO_MODO_PALAVRA: "acumula" | "uma-por-vez" = "acumula";

/** A partir da 2ª visita: só a linha de abertura, esta frase e o botão. */
export const APAGAO_FRASE_CURTA = "Só o relógio ficou acordado.";

export const APAGAO_BOTAO = "[ O RELÓGIO ]";

/** Áudio da fala (opcional): public/sounds/p3-apagao.mp3. */
export const APAGAO_AUDIO = "sounds/p3-apagao.mp3";

/** 1ª visita completa já vista (as seguintes são curtas). */
export const CHAVE_APAGAO_VISTO = "veu-apagao-visto";

// ── Regra ───────────────────────────────────────────────────────────────────

const EVENTO = "veu-apagao";

/** O apagão está valendo neste instante (ms epoch)? */
export function apagaoNoAr(agoraMs: number): boolean {
  if (import.meta.env.DEV) {
    let forca: string | null = null;
    try {
      forca = localStorage.getItem("veu-apagao-forca");
    } catch {
      /* ignore */
    }
    return forca !== "desligado";
  }
  return APAGAO_ATIVO && agoraMs < APAGAO_ATE.getTime();
}

/** Avisa quem estiver ouvindo que a regra pode ter mudado (atalhos de teste). */
export function ouveApagao(f: () => void): () => void {
  window.addEventListener(EVENTO, f);
  return () => window.removeEventListener(EVENTO, f);
}

export function apagaoJaVisto(): boolean {
  try {
    return localStorage.getItem(CHAVE_APAGAO_VISTO) === "1";
  } catch {
    return false;
  }
}

export function marcaApagaoVisto() {
  try {
    localStorage.setItem(CHAVE_APAGAO_VISTO, "1");
  } catch {
    /* ignore */
  }
}

/** URL do countdown, a partir da raiz do site (BASE_URL do Vite). */
export function urlDoRelogio(): string {
  return `${import.meta.env.BASE_URL}timer/`;
}

// ── Atalhos de teste — só em `npm run dev` ──────────────────────────────────
//   testeApagao.ligar()     força o apagão (é o padrão em dev)
//   testeApagao.desligar()  desliga o apagão nesta máquina (fica gravado)
//   testeApagao.zerar()     volta ao padrão e apaga o "já visto" (1ª visita de novo)
export function registraTesteApagao() {
  if (import.meta.env.DEV) {
    const grava = (v: string | null) => {
      try {
        if (v === null) localStorage.removeItem("veu-apagao-forca");
        else localStorage.setItem("veu-apagao-forca", v);
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event(EVENTO));
    };
    (window as unknown as { testeApagao: unknown }).testeApagao = {
      ligar: () => grava("ligado"),
      desligar: () => grava("desligado"),
      zerar: () => {
        try {
          localStorage.removeItem(CHAVE_APAGAO_VISTO);
        } catch {
          /* ignore */
        }
        grava(null);
      },
    };
    console.info("%c[apagao] testeApagao: ligar() · desligar() · zerar()", "color:#00FF66");
  }
}
