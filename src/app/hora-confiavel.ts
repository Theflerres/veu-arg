// ============================================================================
// HORA CONFIÁVEL — mesma técnica do countdown (timer/index.html)
// ============================================================================
// O relógio do sistema é de quem abriu a página, e quem quer adiantar um
// evento adianta ele. agora() parte de uma âncora — o horário do servidor,
// lido do cabeçalho Date de um fetch da própria página — e anda com
// performance.now(), que é monotônico e ignora mudança no relógio do sistema.
//
// Até o servidor responder (ou se ele não responder em TIMEOUT_MS, ou não
// houver rede), a âncora é o relógio local: é o fallback silencioso.
// sincronizaHora() sempre resolve, em até TIMEOUT_MS (mais meio segundo de folga).

const TIMEOUT_MS = 5000;

const relogio = {
  base: Date.now(), // horário (ms epoch) no instante perf0
  perf0: performance.now(),
  sincronizado: false,
};

let pedido: Promise<boolean> | null = null;

export function agora(): number {
  return relogio.base + (performance.now() - relogio.perf0);
}

export function horaSincronizada(): boolean {
  return relogio.sincronizado;
}

/** Ancora agora() no servidor uma vez por carregamento. true = conseguiu. */
export function sincronizaHora(): Promise<boolean> {
  // A corrida com o timer garante a resposta mesmo sem AbortController (ou
  // com um fetch que nunca termina).
  pedido ??= Promise.race([
    perguntaAoServidor(),
    new Promise<boolean>((r) => setTimeout(() => r(false), TIMEOUT_MS + 500)),
  ]);
  return pedido;
}

function perguntaAoServidor(): Promise<boolean> {
  return (async () => {
    const controle = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => controle?.abort(), TIMEOUT_MS);
    try {
      const t0 = performance.now();
      const resp = await fetch(window.location.href.split("#")[0], {
        cache: "no-store",
        signal: controle?.signal,
      });
      const t1 = performance.now();
      // só o cabeçalho interessa: não baixa o resto da página
      try {
        void resp.body?.cancel();
      } catch {
        /* ignore */
      }
      const ms = Date.parse(resp.headers.get("Date") ?? "");
      if (!Number.isFinite(ms)) return false;
      // O cabeçalho trunca no segundo (+500 centra), e o servidor carimbou a
      // resposta mais ou menos no meio da ida e volta.
      relogio.base = ms + 500 + (t1 - t0) / 2;
      relogio.perf0 = t1;
      relogio.sincronizado = true;
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  })();
}

/** Data/hora em America/Sao_Paulo (UTC-3 fixo: o Brasil não tem mais horário de verão). */
export function horaSP(ms: number = agora()) {
  const d = new Date(ms - 3 * 60 * 60 * 1000);
  return {
    dia: d.getUTCDate(),
    mes: d.getUTCMonth() + 1,
    ano: d.getUTCFullYear(),
    hora: d.getUTCHours(),
    minuto: d.getUTCMinutes(),
  };
}
