import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CHAT_DIALOGUES, type ChatDialogue, type ChatMessage } from "../chat-dialogues";
import { CHAT_VARIANTES_DESLIZE, dialogoDaVariante } from "../bott-chat-data";
import {
  BOTT_ABERTURA,
  CHAT_FIM_DESLIZE_MS,
  CHAT_FLASH_MS,
  CHAT_PESO_DESLIZE,
  CHAT_RESPOSTA_RAPIDA_MS,
} from "../bott-data";
import { CHAVES, marcaGatilhoNivel3 } from "../bott-progresso";
import { registraTesteBott } from "../bott-teste";
import { liberaEvento, reservaEvento } from "../eventos-raros";
import { agora, sincronizaHora } from "../hora-confiavel";
import { playChatSound } from "../sounds";

// ============================================================================
// CHAT DO TERMINAL (P3LUCHE vs Bott)
// ============================================================================
// O agendador (arg-engine.ts) chama abreChatSorteado() quando o tempo ativo
// passa do limite. O diálogo sai de um sorteio com peso: cada diálogo de
// chat-dialogues.ts pesa 1 e pode repetir; cada variante de deslize
// (bott-chat-data.ts) pesa CHAT_PESO_DESLIZE e só entra se:
//   • a hora confiável já passou de BOTT_ABERTURA;
//   • o visitante já viu pelo menos uma aparição do chat depois dessa data
//     (CHAVES.chatN);
//   • ele ainda não viu essa variante (CHAVES.chatVistos).
// Uma variante de deslize vista até o fim grava o gatilho do nível 3; fechar
// antes não conta.
//
// Enquanto a janela está aberta, o chat ocupa a vez em eventos-raros.ts (a
// abelha não voa); com a abelha na vez, o chat não abre e o agendador tenta de
// novo na próxima checagem. A Interceptação, ao abrir, fecha o chat (App.tsx).

const NEON = "#00FF66";
const DESLIZE = "#FF8A1F";
const AUTO_CLOSE_DELAY_MS = 10000;
const EVENTO = "chat";

// ── Registro (localStorage) ─────────────────────────────────────────────────

function leNumero(chave: string): number {
  try {
    const n = Number(localStorage.getItem(chave));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function leVistos(): Set<string> {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVES.chatVistos) ?? "[]");
    return new Set(Array.isArray(lista) ? lista.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function grava(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* quota / modo privado — vale só para esta aba */
  }
}

/** Conta a aparição (só depois de BOTT_ABERTURA) e marca a variante de deslize como vista. */
function registraAparicao(deslizeId: string | null) {
  if (agora() >= BOTT_ABERTURA) grava(CHAVES.chatN, String(leNumero(CHAVES.chatN) + 1));
  if (deslizeId) grava(CHAVES.chatVistos, JSON.stringify([...leVistos(), deslizeId]));
}

// ── Sorteio ─────────────────────────────────────────────────────────────────

interface Candidato {
  dialogo: ChatDialogue;
  peso: number;
  deslizeId: string | null;
}

function candidatos(): Candidato[] {
  const lista: Candidato[] = CHAT_DIALOGUES.map((dialogo) => ({ dialogo, peso: 1, deslizeId: null }));
  const liberadas = agora() >= BOTT_ABERTURA && leNumero(CHAVES.chatN) >= 1;
  if (liberadas && CHAT_PESO_DESLIZE > 0) {
    const vistos = leVistos();
    for (const v of CHAT_VARIANTES_DESLIZE) {
      const dialogo = vistos.has(v.id) ? null : dialogoDaVariante(v);
      if (dialogo) lista.push({ dialogo, peso: CHAT_PESO_DESLIZE, deslizeId: v.id });
    }
  }
  return lista;
}

function sorteia(lista: Candidato[]): Candidato {
  let r = Math.random() * lista.reduce((s, c) => s + c.peso, 0);
  for (const c of lista) {
    r -= c.peso;
    if (r < 0) return c;
  }
  return lista[lista.length - 1];
}

// ── Estado global (fora do React) ───────────────────────────────────────────

export interface ChatAberto {
  dialogo: ChatDialogue;
  deslizeId: string | null;
  n: number;
}

let atual: ChatAberto | null = null;
let aberturas = 0;
const ouvintes = new Set<() => void>();

function avisa() {
  ouvintes.forEach((f) => f());
}

function abre(c: Candidato): boolean {
  if (atual || !reservaEvento(EVENTO)) return false;
  atual = { dialogo: c.dialogo, deslizeId: c.deslizeId, n: ++aberturas };
  avisa();
  return true;
}

/**
 * Chamado pelo agendador. true = abriu; false = não deu agora (já aberto ou
 * a abelha está na vez) — o agendador tenta de novo na próxima checagem.
 */
export function abreChatSorteado(): boolean {
  void sincronizaHora();
  const c = sorteia(candidatos());
  if (!abre(c)) return false;
  registraAparicao(c.deslizeId);
  return true;
}

export function fechaChat() {
  if (!atual) return;
  atual = null;
  liberaEvento(EVENTO);
  avisa();
}

export function useChatAberto(): ChatAberto | null {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => atual
  );
}

if (import.meta.env.DEV) {
  registraTesteBott({
    chat: (n: number) => {
      const v = CHAT_VARIANTES_DESLIZE[Math.floor(n) - 1];
      const dialogo = v && dialogoDaVariante(v);
      if (!v || !dialogo) {
        console.warn(`[bott] use 1 a ${CHAT_VARIANTES_DESLIZE.length}`);
        return;
      }
      fechaChat();
      if (!abre({ dialogo, peso: 0, deslizeId: v.id })) console.warn("[bott] a abelha está na vez; tente de novo");
    },
  });
}

// ── Janela ──────────────────────────────────────────────────────────────────

const CSS = `
@keyframes chat-tremor{0%,100%{transform:none}20%{transform:translate(-.6px,.4px)}40%{transform:translate(.5px,-.5px)}60%{transform:translate(-.4px,-.3px)}80%{transform:translate(.6px,.3px)}}
@keyframes chat-flash{0%{opacity:0}25%{opacity:.85}100%{opacity:0}}
`;

export function ChatWidget({
  dialogo,
  onClose,
  onCompleto,
}: {
  dialogo: ChatDialogue;
  onClose: () => void;
  /** Chamado quando a última fala aparece (a conversa foi vista até o fim). */
  onCompleto?: () => void;
}) {
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [typingSender, setTypingSender] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // onClose chega recriado a cada re-render do pai — via ref para o
  // auto-close não depender da referência da função ficar estável.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onCompletoRef = useRef(onCompleto);
  onCompletoRef.current = onCompleto;
  const temDeslize = dialogo.messages.some((m) => m.tipo === "deslize");

  useEffect(() => {
    playChatSound();
  }, []);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let cumulative = 300;

    dialogo.messages.forEach((msg, i) => {
      // Logo depois de uma fala de deslize, a resposta chega bem mais rápido.
      const delay =
        dialogo.messages[i - 1]?.tipo === "deslize" ? Math.min(msg.delay, CHAT_RESPOSTA_RAPIDA_MS) : msg.delay;
      timeouts.push(setTimeout(() => setTypingSender(msg.sender), cumulative));
      cumulative += delay;
      timeouts.push(
        setTimeout(() => {
          setTypingSender(null);
          setVisibleMessages((prev) => [...prev, msg]);
        }, cumulative)
      );
    });

    return () => timeouts.forEach(clearTimeout);
  }, [dialogo]);

  // Fim: sem deslize, fecha AUTO_CLOSE_DELAY_MS após a última mensagem; com
  // deslize, flash verde curto e fecha.
  const completo = visibleMessages.length > 0 && visibleMessages.length >= dialogo.messages.length;
  useEffect(() => {
    if (!completo) return;
    onCompletoRef.current?.();
    if (!temDeslize) {
      const t = setTimeout(() => onCloseRef.current(), AUTO_CLOSE_DELAY_MS);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setFlash(true), CHAT_FIM_DESLIZE_MS);
    const t2 = setTimeout(() => onCloseRef.current(), CHAT_FIM_DESLIZE_MS + CHAT_FLASH_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [completo, temDeslize]);

  // Esc fecha.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleMessages, typingSender]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        width: 320,
        maxHeight: 340,
        background: "rgba(2,8,4,0.97)",
        border: `1px solid ${NEON}`,
        boxShadow: "0 0 24px rgba(0,255,102,0.25)",
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Share Tech Mono',monospace",
        animation: "chat-slide-in 0.35s cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      <style>{CSS}</style>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 10px",
          borderBottom: "1px solid rgba(0,255,102,0.3)",
        }}
      >
        <span style={{ color: NEON, fontSize: 10, letterSpacing: "0.15em" }}>■ CANAL INTERCEPTADO</span>
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{ background: "none", border: "none", color: NEON, cursor: "pointer", fontSize: 12 }}
        >
          ✕
        </button>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minHeight: 120,
        }}
      >
        {visibleMessages.map((m, i) => {
          const deslize = m.tipo === "deslize";
          return (
            <div key={i} style={{ fontSize: 12, lineHeight: 1.4 }}>
              <span style={{ color: m.sender === "P3LUCHE" ? NEON : "#2BEA7B", fontWeight: "bold" }}>
                {m.sender}:{" "}
              </span>
              <span
                style={{
                  color: deslize ? DESLIZE : "#B9FFCF",
                  display: deslize ? "inline-block" : undefined,
                  textShadow: deslize ? "0 0 8px rgba(255,138,31,0.6)" : undefined,
                  animation: deslize ? "chat-tremor .22s linear infinite" : undefined,
                }}
              >
                {m.text}
              </span>
            </div>
          );
        })}
        {typingSender && (
          <div style={{ fontSize: 11, color: "rgba(0,255,102,0.55)", fontStyle: "italic" }}>
            [{typingSender} está digitando...]
          </div>
        )}
      </div>

      {/* Flash verde de fechamento (variantes de deslize) */}
      {flash && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: NEON,
            pointerEvents: "none",
            animation: `chat-flash ${CHAT_FLASH_MS}ms ease-out both`,
          }}
        />
      )}
    </div>
  );
}
