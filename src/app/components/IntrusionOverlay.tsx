
import { useEffect, useRef, useState } from "react";
import { generateLogLine, FINAL_LOG_SEQUENCE, type LogLine } from "../network-logs";

const NEON = "#00FF66";
const LOG_TICK_MS = 90;
const LOG_PHASE_DURATION_MS = 4500;

export function IntrusionOverlay({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [crashed, setCrashed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // onDone chega recriado a cada re-render do pai (ex: relógio de uptime rodando
  // a cada 1s) — via ref para não reiniciar os timers abaixo a cada re-render.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const logIv = setInterval(() => {
      setLines((prev) => [...prev.slice(-80), generateLogLine()]);
    }, LOG_TICK_MS);

    const stopAt = setTimeout(() => {
      clearInterval(logIv);
      FINAL_LOG_SEQUENCE.forEach((line, i) => {
        timeouts.push(
          setTimeout(() => setLines((prev) => [...prev, line]), i * 500)
        );
      });
      const finalDelay = FINAL_LOG_SEQUENCE.length * 500;
      timeouts.push(setTimeout(() => setCrashed(true), finalDelay + 400));
      timeouts.push(setTimeout(() => onDoneRef.current(), finalDelay + 2200));
    }, LOG_PHASE_DURATION_MS);

    return () => {
      clearInterval(logIv);
      clearTimeout(stopAt);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000502",
        zIndex: 250,
        fontFamily: "'Share Tech Mono',monospace",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "6px 14px",
          borderBottom: "1px solid rgba(255,0,51,0.5)",
          color: "#FF3333",
          fontSize: 11,
          letterSpacing: "0.2em",
          animation: "blink 0.6s step-end infinite",
          flexShrink: 0,
        }}
      >
        [CRITICAL_SECURITY_BREACH] — MODO DE EMERGÊNCIA
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 16px",
          fontSize: 11,
          lineHeight: 1.6,
        }}
      >
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              color: l.tone === "critical" ? "#FF3333" : l.tone === "warn" ? "#FFD166" : NEON,
              opacity: 0.9,
              whiteSpace: "pre-wrap",
            }}
          >
            {l.text}
          </div>
        ))}
      </div>

      {crashed && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ color: "#FF3333", fontSize: 28, letterSpacing: "0.15em", textAlign: "center" }}>
            CONEXÃO PERDIDA
          </div>
          <div style={{ color: "rgba(0,255,102,0.4)", fontSize: 11, letterSpacing: "0.1em" }}>
            SISTEMA COMPROMETIDO // ENCERRANDO SESSÃO
          </div>
        </div>
      )}
    </div>
  );
}
