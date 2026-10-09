// ============================================================================
// Atalhos de teste do hub da Bott — window.testeBott, só em `npm run dev`
// ============================================================================
// Todo o corpo fica dentro de `if (import.meta.env.DEV)`: no build de
// produção o bloco é removido (ver DEBUG-AUDIT.md e scripts/check-debug-leaks.js).
//
//   testeBott.abrirHub()        abre o hub
//   testeBott.abelha()          solta a abelha agora (no site principal, já logado)
//   testeBott.chat(n)           abre a variante de deslize n no chat do terminal (no site principal, já logado)
//   testeBott.nivel(n)          abre o hub disparando o degrau n (1–3; 4 = camada final; 0 zera)
//   testeBott.estado(e)         sobrepõe ESTADO_MUNDO ("desconhecido" | "nao-contaram" | "contaram")
//   testeBott.zerar()           apaga todas as chaves veu-bott-*
//   testeBott.sigla()           mostra de novo o cartão de orientação da entrada, sem a abelha (no hub)
//   testeBott.piscaSigla(ms?)   faz o cabeçalho do hub piscar para a sigla escondida (padrão: SIGLA_PISCA_MS.nivel2)
//   testeBott.noventaENove()    no hub, leva a barra do DIAGNÓSTICO ao último degrau (ignora o teto) e dispara a cena
//   testeBott.inspecao()        no hub, abre o modo de inspeção 3D (se o modelo existir)

import { CHAVES, CHAVES_DEV, HUB_URL, gravaNivel } from "./bott-progresso";

interface TesteBott {
  abrirHub: () => void;
  abelha: () => void;
  chat: (n: number) => void;
  nivel: (n: number) => void;
  estado: (e: string) => void;
  zerar: () => void;
  sigla: () => void;
  piscaSigla: (ms?: number) => void;
  noventaENove: () => void;
  inspecao: () => void;
}

declare global {
  interface Window {
    testeBott?: TesteBott;
  }
}

/** Registra/atualiza os atalhos. Chame só dentro de `if (import.meta.env.DEV)`. */
export function registraTesteBott(extra: Partial<TesteBott> = {}) {
  if (import.meta.env.DEV) {
    const abrirHub = () => window.location.assign(HUB_URL);
    const base: TesteBott = {
      abrirHub,
      abelha: () => console.info("[bott] a abelha só voa no site principal, depois da senha"),
      chat: () => console.info("[bott] o chat só abre no site principal, depois da senha"),
      sigla: () => console.info("[bott] a sigla só aparece no hub"),
      piscaSigla: () => console.info("[bott] a sigla só aparece no hub"),
      noventaENove: () => console.info("[bott] a barra só existe no hub"),
      inspecao: () => console.info("[bott] o modo de inspeção só existe no hub"),
      nivel: (n) => {
        const alvo = Math.max(0, Math.min(4, Math.floor(n)));
        try {
          localStorage.removeItem(CHAVES_DEV.forca);
          gravaNivel(Math.max(0, alvo - 1));
          if (alvo > 0) localStorage.setItem(CHAVES_DEV.forca, String(alvo));
        } catch {
          /* ignore */
        }
        abrirHub();
      },
      estado: (e) => {
        if (e !== "desconhecido" && e !== "nao-contaram" && e !== "contaram") {
          console.warn('[bott] use "desconhecido", "nao-contaram" ou "contaram"');
          return;
        }
        try {
          localStorage.setItem(CHAVES_DEV.estado, e);
        } catch {
          /* ignore */
        }
        abrirHub();
      },
      zerar: () => {
        try {
          for (const k of Object.keys(localStorage)) if (k.startsWith("veu-bott-")) localStorage.removeItem(k);
        } catch {
          /* ignore */
        }
        console.info("[bott] progresso zerado:", Object.values(CHAVES).join(", "));
      },
    };
    window.testeBott = { ...base, ...window.testeBott, ...extra };
  }
}
