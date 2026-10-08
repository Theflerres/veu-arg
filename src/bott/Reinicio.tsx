import { useEffect, useRef, useState } from "react";
import { AMBAR, DISPLAY, HEX_CLIP, LABEL, VERDE, VERDE_DIM } from "./estilo";

// ============================================================================
// SURTO + REINÍCIO
// ============================================================================
// Surto: flashes de fragmentos de texto por cima do hub.
// Reinício (estilo modem caindo): SINAL INSTÁVEL, barras de sinal caindo,
// LEDs hexagonais apagando um a um → tela preta (onApagado: o hub por baixo
// remonta do zero) → REINICIANDO..., LEDs voltando → fade (onFim).
// `atrasoMs` adia o começo, sem nada na tela.

const BLOCOS = "█▓▒░▚▞▙▟╳";

export function Surto({ fragmentos, duracaoMs, onFim }: { fragmentos: string[]; duracaoMs: number; onFim: () => void }) {
  const [quadro, setQuadro] = useState(0);
  const onFimRef = useRef(onFim);
  onFimRef.current = onFim;

  useEffect(() => {
    const iv = setInterval(() => setQuadro((q) => q + 1), 110);
    const t = setTimeout(() => onFimRef.current(), duracaoMs);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [duracaoMs]);

  const flash = quadro % 7 === 3 || quadro % 11 === 5;
  const qtd = 1 + Math.floor(Math.random() * 3);
  const itens = Array.from({ length: qtd }, () => {
    const texto = fragmentos.length
      ? fragmentos[Math.floor(Math.random() * fragmentos.length)]
      : Array.from({ length: 6 + Math.floor(Math.random() * 14) }, () => BLOCOS[Math.floor(Math.random() * BLOCOS.length)]).join("");
    return {
      texto,
      x: 4 + Math.random() * 60,
      y: 8 + Math.random() * 80,
      tam: 14 + Math.random() * 30,
      op: 0.5 + Math.random() * 0.5,
    };
  });

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        pointerEvents: "none",
        background: flash ? "rgba(255,240,210,.85)" : "rgba(0,0,0,.45)",
        transform: `translate(${Math.round(Math.random() * 8 - 4)}px, ${Math.round(Math.random() * 6 - 3)}px)`,
      }}
    >
      {!flash &&
        itens.map((it, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${it.x}%`,
              top: `${it.y}%`,
              maxWidth: "90vw",
              fontFamily: DISPLAY,
              fontSize: it.tam,
              color: AMBAR,
              opacity: it.op,
              textShadow: "0 0 12px rgba(255,176,0,.7), 3px 0 rgba(0,229,255,.4)",
              whiteSpace: "pre-wrap",
            }}
          >
            {it.texto}
          </div>
        ))}
    </div>
  );
}

// Linha do tempo do reinício (ms depois do atraso)
const T_PRETO = 2500;
const T_VOLTA = 3400;
const T_FADE = 5800;
const T_FIM = 6500;
const BARRAS = 5;
const LEDS = 7;

export function Reinicio({
  atrasoMs = 0,
  onApagado,
  onFim,
}: {
  atrasoMs?: number;
  onApagado: () => void;
  onFim: () => void;
}) {
  const [t, setT] = useState(-1); // -1 = ainda no atraso
  const cbs = useRef({ onApagado, onFim });
  cbs.current = { onApagado, onFim };

  useEffect(() => {
    let iv: ReturnType<typeof setInterval>;
    let apagou = false;
    const comeca = setTimeout(() => {
      const t0 = performance.now();
      iv = setInterval(() => {
        const dt = performance.now() - t0;
        if (!apagou && dt >= T_PRETO) {
          apagou = true;
          cbs.current.onApagado();
        }
        if (dt >= T_FIM) {
          clearInterval(iv);
          cbs.current.onFim();
          return;
        }
        setT(dt);
      }, 40);
    }, Math.max(0, atrasoMs));
    return () => {
      clearTimeout(comeca);
      clearInterval(iv);
    };
  }, [atrasoMs]);

  if (t < 0) return null;

  const preto = t >= T_PRETO && t < T_VOLTA;
  const voltando = t >= T_VOLTA;
  // Caindo: uma barra a cada 420ms (da mais alta); LEDs a cada 300ms a partir de 500ms.
  const barrasAcesas = voltando
    ? Math.min(BARRAS, Math.floor((t - T_VOLTA) / 380))
    : Math.max(0, BARRAS - Math.floor(t / 420));
  const ledsAcesos = voltando
    ? Math.min(LEDS, Math.floor((t - T_VOLTA) / 280))
    : Math.max(0, LEDS - Math.max(0, Math.floor((t - 500) / 300)));
  const opacidade = t < 400 ? t / 400 : t >= T_FADE ? Math.max(0, 1 - (t - T_FADE) / (T_FIM - T_FADE)) : 1;
  const pontos = ".".repeat(1 + (Math.floor(t / 350) % 3));

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
        padding: 16,
        background: t < T_PRETO ? `rgba(0,0,0,${0.55 + Math.min(1, t / T_PRETO) * 0.4})` : "#000",
        opacity: opacidade,
        fontFamily: LABEL,
      }}
    >
      {!preto && (
        <>
          <div
            style={{
              fontFamily: DISPLAY,
              fontSize: "clamp(30px, 6vw, 54px)",
              letterSpacing: "0.12em",
              textAlign: "center",
              color: voltando ? VERDE : AMBAR,
              textShadow: voltando ? "0 0 14px rgba(0,255,102,.6)" : "0 0 14px rgba(255,176,0,.6)",
              animation: voltando ? undefined : "bh-pisca .7s step-end infinite",
            }}
          >
            {voltando ? `REINICIANDO${pontos}` : "SINAL INSTÁVEL"}
          </div>

          {/* Barras de sinal */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 44 }} aria-hidden="true">
            {Array.from({ length: BARRAS }, (_, i) => {
              const acesa = i < barrasAcesas;
              const cor = voltando ? VERDE : AMBAR;
              return (
                <span
                  key={i}
                  style={{
                    width: 10,
                    height: 10 + i * 8,
                    background: acesa ? cor : "rgba(255,255,255,.06)",
                    boxShadow: acesa ? `0 0 8px ${cor}` : undefined,
                    transition: "background .12s",
                  }}
                />
              );
            })}
          </div>

          {/* LEDs hexagonais */}
          <div style={{ display: "flex", gap: 10 }} aria-hidden="true">
            {Array.from({ length: LEDS }, (_, i) => {
              const acesa = i < ledsAcesos;
              return (
                <span
                  key={i}
                  style={{
                    width: 20,
                    height: 18,
                    clipPath: HEX_CLIP,
                    background: acesa ? VERDE : VERDE_DIM,
                    opacity: acesa ? 1 : 0.35,
                    filter: acesa ? "drop-shadow(0 0 6px #00FF66)" : undefined,
                    transition: "background .1s, opacity .1s",
                  }}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
