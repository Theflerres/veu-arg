// ============================================================================
// RAIZ DO SITE — decide entre o P3 e o Sistema Schrödinger
// ============================================================================
// • ?eco=… na raiz → /p3/?eco=… (a tela de reconhecimento continua no P3).
// • Antes de DATA_TRANSICAO (hora do servidor, hora-confiavel.ts) a raiz
//   continua sendo o P3: monta o mesmo App de /p3/ (src/main.tsx), sem mudar
//   a URL. Depois, monta o Sistema Schrödinger.
// • Mais de 24 h antes da virada, o relógio local basta para mostrar o P3 na
//   hora. Perto dela (ou depois), espera a hora do servidor (até ~5 s):
//   adiantar o relógio do computador não abre nada.

import { horaSincronizada, sincronizaHora } from "../app/hora-confiavel";
import { agoraSch } from "./relogio";
import { DATA_TRANSICAO } from "./config";

const BASE = import.meta.env.BASE_URL;

function montaP3() {
  // a página da raiz tem título e ícones do Schrödinger; enquanto ela for o P3,
  // mostra os do P3
  document.title = "Véu // Terminal de Acesso";
  document.documentElement.lang = "en";
  document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((l) => l.remove());
  void import("../main.tsx");
}

async function iniciar() {
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).testeSchrodinger = {
      /** Simula a hora do site (ISO) e recarrega; null volta ao normal. */
      agora(iso: string | null) {
        try {
          if (iso) localStorage.setItem("sch-agora-teste", iso);
          else localStorage.removeItem("sch-agora-teste");
        } catch {
          /* ignore */
        }
        location.reload();
      },
      /** Apaga transição vista, sessão, mudo e chaves aceitas. */
      zerar() {
        try {
          Object.keys(localStorage).filter((k) => k.startsWith("sch-")).forEach((k) => localStorage.removeItem(k));
          Object.keys(sessionStorage).filter((k) => k.startsWith("sch-")).forEach((k) => sessionStorage.removeItem(k));
        } catch {
          /* ignore */
        }
        location.reload();
      },
    };
  }
  // longe da virada, o relógio local basta para seguir no P3; perto dela (ou
  // depois), vale a hora do servidor
  if (agoraSch() < DATA_TRANSICAO - 24 * 3600_000) return montaP3();
  if (!horaSincronizada()) await sincronizaHora();
  if (agoraSch() < DATA_TRANSICAO) return montaP3();
  const { monta } = await import("./App");
  monta();
}

if (new URLSearchParams(window.location.search).has("eco")) {
  window.location.replace(`${BASE}p3/${window.location.search}${window.location.hash}`);
} else {
  void iniciar();
}
