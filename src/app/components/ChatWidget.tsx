
import { useEffect, useRef, useState } from "react";
import { CHAT_DIALOGUES, type ChatMessage } from "../chat-dialogues";
import { playChatSound } from "../sounds";

const NEON = "#00FF66";
const AUTO_CLOSE_DELAY_MS = 10000;

export function ChatWidget({ onClose }: { onClose: () => void }) {
  const [dialogue] = useState(
    () => CHAT_DIALOGUES[Math.floor(Math.random() * CHAT_DIALOGUES.length)]
  );
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [typingSender, setTypingSender] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // onClose chega recriado a cada re-render do pai — via ref para o
  // auto-close não depender da referência da função ficar estável.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    playChatSound();
  }, []);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let cumulative = 300;

    dialogue.messages.forEach((msg) => {
      timeouts.push(setTimeout(() => setTypingSender(msg.sender), cumulative));
      cumulative += msg.delay;
      timeouts.push(
        setTimeout(() => {
          setTypingSender(null);
          setVisibleMessages((prev) => [...prev, msg]);
        }, cumulative)
      );
    });

    return () => timeouts.forEach(clearTimeout);
  }, [dialogue]);

  // Fecha automaticamente AUTO_CLOSE_DELAY_MS após a última mensagem aparecer
  useEffect(() => {
    if (visibleMessages.length === 0 || visibleMessages.length < dialogue.messages.length) return;
    const t = setTimeout(() => onCloseRef.current(), AUTO_CLOSE_DELAY_MS);
    return () => clearTimeout(t);
  }, [visibleMessages.length, dialogue.messages.length]);

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
        {visibleMessages.map((m, i) => (
          <div key={i} style={{ fontSize: 12, lineHeight: 1.4 }}>
            <span style={{ color: m.sender === "P3LUCHE" ? NEON : "#2BEA7B", fontWeight: "bold" }}>
              {m.sender}:{" "}
            </span>
            <span style={{ color: "#B9FFCF" }}>{m.text}</span>
          </div>
        ))}
        {typingSender && (
          <div style={{ fontSize: 11, color: "rgba(0,255,102,0.55)", fontStyle: "italic" }}>
            [{typingSender} está digitando...]
          </div>
        )}
      </div>
    </div>
  );
}
