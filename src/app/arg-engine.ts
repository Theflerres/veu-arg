// ============================================================================
// ARG EVENT ENGINE — tempo ativo persistido + sorteio de eventos em background
// ============================================================================
// Use o hook `useArgEngine(active, handlers)` dentro do componente que
// representa a tela de documentos (MainTerminal, em App.tsx).
//
// Ajuste os parâmetros de disparo em ARG_CONFIG abaixo.

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    debugARG?: {
      triggerChat: () => void;
      triggerIntrusion: () => void;
      resetTimer: () => void;
      getAccumulatedMinutes: () => number;
    };
  }
}

export const ARG_CONFIG = {
  STORAGE_KEY: "arg_fagulhas_time_v1",

  // Granularidade da contagem de tempo ativo (não mexer sem necessidade)
  ACCUMULATE_TICK_MS: 1000,
  ACCUMULATE_FLUSH_MS: 5000,

  // A cada quanto tempo o motor verifica se um evento agendado deve disparar
  CYCLE_INTERVAL_MS: 5 * 60 * 1000, // 5 minutos

  // Evento A — Chat P3LUCHE vs Bott
  CHAT_FIRST_DELAY_MS: 30 * 60 * 1000, // primeiro chat após 30min
  CHAT_SHORT_DELAY_MS: 30 * 60 * 1000,
  CHAT_LONG_DELAY_MS: 40 * 60 * 1000,

  // Evento B — Falsa detecção de invasão: garantido, não é mais por chance.
  // Primeiro disparo aos 40min de tempo ativo acumulado; depois, a cada 3h.
  INTRUSION_FIRST_TRIGGER_MS: 40 * 60 * 1000,
  INTRUSION_REPEAT_INTERVAL_MS: 3 * 60 * 60 * 1000,
};

interface StoredState {
  accumulatedMs: number;
  nextChatAtMs?: number;
  chatCount?: number;
  nextIntrusionAtMs?: number;
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(ARG_CONFIG.STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // localStorage indisponível ou JSON corrompido — reinicia do zero
  }
  return { accumulatedMs: 0 };
}

function saveState(state: StoredState) {
  try {
    localStorage.setItem(ARG_CONFIG.STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota excedida / modo privado — ignora silenciosamente
  }
}

export function resetArgTimer() {
  saveState({
    accumulatedMs: 0,
    nextChatAtMs: ARG_CONFIG.CHAT_FIRST_DELAY_MS,
    chatCount: 0,
    nextIntrusionAtMs: ARG_CONFIG.INTRUSION_FIRST_TRIGGER_MS,
  });
}

export function getAccumulatedMs(): number {
  return loadState().accumulatedMs;
}

interface ArgEventHandlers {
  onChatEvent: () => void;
  onIntrusionEvent: () => void;
}

/**
 * @param active — true enquanto o usuário estiver na tela de documentos.
 */
export function useArgEngine(active: boolean, handlers: ArgEventHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Acumula tempo ativo (persistido periodicamente, sobrevive a reload)
  useEffect(() => {
    if (!active) return;
    const pending = { ms: 0 };

    const tick = setInterval(() => {
      if (document.visibilityState === "visible") {
        pending.ms += ARG_CONFIG.ACCUMULATE_TICK_MS;
      }
    }, ARG_CONFIG.ACCUMULATE_TICK_MS);

    const flush = setInterval(() => {
      if (pending.ms === 0) return;
      const state = loadState();
      state.accumulatedMs += pending.ms;
      pending.ms = 0;
      saveState(state);
    }, ARG_CONFIG.ACCUMULATE_FLUSH_MS);

    return () => {
      clearInterval(tick);
      clearInterval(flush);
    };
  }, [active]);

  // Ciclo de verificação dos eventos agendados (chat e intrusão, ambos determinísticos)
  useEffect(() => {
    if (!active) return;

    const cycle = setInterval(() => {
      const state = loadState();
      const accumulated = state.accumulatedMs;

      // Evento B — garantido aos 40min, depois a cada 3h (sem sorteio)
      const nextIntrusionAtMs =
        state.nextIntrusionAtMs ?? ARG_CONFIG.INTRUSION_FIRST_TRIGGER_MS;

      if (accumulated >= nextIntrusionAtMs) {
        handlersRef.current.onIntrusionEvent();
        saveState({
          ...state,
          nextIntrusionAtMs: nextIntrusionAtMs + ARG_CONFIG.INTRUSION_REPEAT_INTERVAL_MS,
        });
        return;
      }

      const nextChatAtMs =
        state.nextChatAtMs ?? ARG_CONFIG.CHAT_FIRST_DELAY_MS;
      const chatCount = state.chatCount ?? 0;

      if (accumulated >= nextChatAtMs) {
        handlersRef.current.onChatEvent();
        saveState({
          ...state,
          nextChatAtMs:
            nextChatAtMs +
            (chatCount % 2 === 0
              ? ARG_CONFIG.CHAT_LONG_DELAY_MS
              : ARG_CONFIG.CHAT_SHORT_DELAY_MS),
          chatCount: chatCount + 1,
        });
      }
    }, ARG_CONFIG.CYCLE_INTERVAL_MS);

    return () => clearInterval(cycle);
  }, [active]);

  // Atalhos de debug — window.debugARG no DevTools Console
  useEffect(() => {
    window.debugARG = {
      triggerChat: () => handlersRef.current.onChatEvent(),
      triggerIntrusion: () => handlersRef.current.onIntrusionEvent(),
      resetTimer: () => resetArgTimer(),
      getAccumulatedMinutes: () => Math.floor(getAccumulatedMs() / 60000),
    };
    console.log(
      "%c[ARG] window.debugARG pronto — triggerChat() · triggerIntrusion() · resetTimer()",
      "color:#00FF66"
    );
    return () => {
      delete window.debugARG;
    };
  }, []);
}
