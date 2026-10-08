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

  // Com o motor ligado, a cada quanto tempo confere se o tempo ativo passou
  // do limite do próximo chat (o limite fica salvo em nextChatAtMs). Também
  // confere CHECK_ON_START_MS depois de o motor ligar, para quem entra e sai
  // de telas com frequência não ficar sem chat.
  CHECK_INTERVAL_MS: 30 * 1000,
  CHECK_ON_START_MS: 3000,

  // Evento A — Chat P3LUCHE vs Bott
  CHAT_FIRST_DELAY_MS: 30 * 60 * 1000, // primeiro chat após 30min
  CHAT_SHORT_DELAY_MS: 30 * 60 * 1000,
  CHAT_LONG_DELAY_MS: 40 * 60 * 1000,

  // Evento B (falsa detecção de invasão / firewall) foi removido na fase Grupos.
};

interface StoredState {
  accumulatedMs: number;
  nextChatAtMs?: number;
  chatCount?: number;
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
  });
}

export function getAccumulatedMs(): number {
  return loadState().accumulatedMs;
}

interface ArgEventHandlers {
  /** Abre o chat. false = não deu agora (o limite não avança; tenta de novo na próxima checagem). */
  onChatEvent: () => boolean | void;
}

/**
 * @param active — true enquanto o usuário estiver na tela de documentos.
 */
export function useArgEngine(active: boolean, handlers: ArgEventHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Acumula tempo ativo (persistido periodicamente, sobrevive a reload) e
  // confere o limite do próximo chat. O limite é persistido, então desligar e
  // religar o motor (abrir/fechar um Grupo) não zera nada: só o tempo com o
  // motor ligado e a aba visível conta.
  useEffect(() => {
    if (!active) return;
    let pending = 0;

    const flush = () => {
      if (pending === 0) return;
      const state = loadState();
      state.accumulatedMs += pending;
      pending = 0;
      saveState(state);
    };

    const check = () => {
      flush();
      const state = loadState();
      const nextChatAtMs = state.nextChatAtMs ?? ARG_CONFIG.CHAT_FIRST_DELAY_MS;
      const chatCount = state.chatCount ?? 0;
      if (state.accumulatedMs < nextChatAtMs) return;
      if (handlersRef.current.onChatEvent() === false) return;
      // Cadência 30 → 70 → 100 → 140 → 170 min... contada a partir do limite;
      // se o tempo ativo já passou muito dele, conta a partir de agora (sem
      // disparar vários chats seguidos).
      const base =
        state.accumulatedMs - nextChatAtMs > ARG_CONFIG.CHAT_SHORT_DELAY_MS ? state.accumulatedMs : nextChatAtMs;
      saveState({
        ...state,
        nextChatAtMs:
          base + (chatCount % 2 === 0 ? ARG_CONFIG.CHAT_LONG_DELAY_MS : ARG_CONFIG.CHAT_SHORT_DELAY_MS),
        chatCount: chatCount + 1,
      });
    };

    const tick = setInterval(() => {
      if (document.visibilityState === "visible") pending += ARG_CONFIG.ACCUMULATE_TICK_MS;
    }, ARG_CONFIG.ACCUMULATE_TICK_MS);
    const flushIv = setInterval(flush, ARG_CONFIG.ACCUMULATE_FLUSH_MS);
    const checkIv = setInterval(check, ARG_CONFIG.CHECK_INTERVAL_MS);
    const checkStart = setTimeout(check, ARG_CONFIG.CHECK_ON_START_MS);

    return () => {
      clearInterval(tick);
      clearInterval(flushIv);
      clearInterval(checkIv);
      clearTimeout(checkStart);
      flush(); // o tempo acumulado desde o último flush não se perde
    };
  }, [active]);

  // Atalhos de debug — window.debugARG no DevTools Console. Só em `npm run dev`:
  // no build de produção o corpo inteiro é removido.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.debugARG = {
      triggerChat: () => handlersRef.current.onChatEvent(),
      resetTimer: () => resetArgTimer(),
      getAccumulatedMinutes: () => Math.floor(getAccumulatedMs() / 60000),
    };
    console.log(
      "%c[ARG] window.debugARG pronto — triggerChat() · resetTimer()",
      "color:#00FF66"
    );
    return () => {
      delete window.debugARG;
    };
  }, []);
}
