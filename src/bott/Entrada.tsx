import { useEffect, useRef, useState } from "react";
import { AbelhaPixel } from "../app/components/AbelhaPixel";
import { ENTRADA_LINHAS, ENTRADA_MS } from "../app/bott-data";
import { AMBAR, DISPLAY, LABEL, VERDE } from "./estilo";

// ============================================================================
// ENTRADA DO HUB — ~7 s
// ============================================================================
// Tela preta; uma abelha digital grande atravessa da esquerda para a direita
// e o feixe de scan que ela arrasta revela o cabeçalho e as linhas de boot
// (a revelação é um clip-path que anda junto com a abelha). Um glitch curto
// no meio. Da segunda visita em diante, clique ou Esc pula.
//
// Linha do tempo (ms, com ENTRADA_MS = 7000):
//   0–400      preto
//   400–5400   travessia: a âncora da abelha vai de -30vw a 115vw (linear)
//   ~1430–4880 revelação (âncora entre 0 e 100vw)
//   ~3300      glitch
//   6300–7000  fade para o hub

const VOO_INICIO = 400;
const VOO_MS = 5000;
const DE_VW = -30;
const ATE_VW = 115;
const FADE_MS = 700;

// A revelação acompanha a âncora: começa quando ela passa por 0vw e termina em 100vw.
const REVELA_INICIO = VOO_INICIO + (VOO_MS * (0 - DE_VW)) / (ATE_VW - DE_VW);
const REVELA_MS = (VOO_MS * 100) / (ATE_VW - DE_VW);

const CSS = `
@keyframes ent-voo{from{transform:translateX(${DE_VW}vw)}to{transform:translateX(${ATE_VW}vw)}}
@keyframes ent-ondula{0%{transform:translate(-50%,calc(-50% - 6vh)) rotate(-5deg)}100%{transform:translate(-50%,calc(-50% + 6vh)) rotate(4deg)}}
@keyframes ent-revela{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes ent-glitch{0%,46%,49.5%,100%{transform:none;filter:none}46.5%{transform:translate(-10px,2px) skewX(-6deg);filter:drop-shadow(5px 0 #FF0040) drop-shadow(-5px 0 #00E5FF)}47.3%{transform:translate(8px,-3px);filter:drop-shadow(-6px 0 ${AMBAR}) drop-shadow(6px 0 #00E5FF) brightness(1.6)}48.1%{transform:translate(-4px,0) scaleY(1.04);filter:invert(1) hue-rotate(90deg)}48.9%{transform:translate(3px,1px);filter:drop-shadow(3px 0 #FF0040)}}
@keyframes ent-faixa{0%,46%,49.5%,100%{opacity:0}46.5%,48.6%{opacity:1}}
@keyframes ent-tremor{0%,100%{opacity:1}50%{opacity:.85}}
.ent-palco{position:absolute;inset:0;animation:ent-glitch ${ENTRADA_MS}ms linear both}
.ent-revela{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:16px;clip-path:inset(0 100% 0 0);animation:ent-revela ${REVELA_MS}ms linear ${REVELA_INICIO}ms both}
.ent-voo{position:absolute;top:0;bottom:0;left:0;width:0;transform:translateX(${DE_VW}vw);animation:ent-voo ${VOO_MS}ms linear ${VOO_INICIO}ms both}
.ent-rastro{position:absolute;top:0;bottom:0;right:0;width:38vw;background:linear-gradient(90deg,transparent 0%,rgba(0,255,102,.04) 55%,rgba(0,255,102,.16) 92%,rgba(220,255,230,.9) 99.6%,transparent 100%)}
.ent-rastro::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(to bottom,rgba(0,255,102,.22) 0 1px,transparent 1px 5px);-webkit-mask-image:linear-gradient(90deg,transparent 40%,#000);mask-image:linear-gradient(90deg,transparent 40%,#000)}
.ent-abelha{position:absolute;top:50%;left:0;color:#F4FFE8;filter:drop-shadow(0 0 6px rgba(0,255,102,.9)) drop-shadow(0 0 24px rgba(0,255,102,.35));animation:ent-ondula .85s ease-in-out infinite alternate}
.ent-faixas{position:absolute;inset:0;pointer-events:none;opacity:0;animation:ent-faixa ${ENTRADA_MS}ms linear both;background:linear-gradient(to bottom,transparent 22%,rgba(0,255,102,.25) 22% 24%,transparent 24% 61%,rgba(255,176,0,.3) 61% 62.5%,transparent 62.5% 78%,rgba(255,255,255,.2) 78% 79%,transparent 79%)}
`;

export function Entrada({ pulavel, onFim }: { pulavel: boolean; onFim: () => void }) {
  const [saindo, setSaindo] = useState(false);
  const onFimRef = useRef(onFim);
  onFimRef.current = onFim;
  const largura = Math.round(Math.min(340, Math.max(170, window.innerWidth * 0.26)));

  useEffect(() => {
    const t1 = setTimeout(() => setSaindo(true), ENTRADA_MS - FADE_MS);
    const t2 = setTimeout(() => onFimRef.current(), ENTRADA_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (!pulavel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFimRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pulavel]);

  return (
    <div
      onClick={pulavel ? () => onFimRef.current() : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#000",
        overflow: "hidden",
        cursor: pulavel ? "pointer" : "default",
        opacity: saindo ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <style>{CSS}</style>
      <div className="ent-palco">
        <div className="ent-revela">
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: "clamp(64px, 15vw, 150px)",
                lineHeight: 0.9,
                letterSpacing: "0.14em",
                color: "#EAFFF0",
                textShadow: `0 0 18px ${VERDE}, 0 0 46px rgba(0,255,102,.45), 0 3px 0 rgba(255,176,0,.35)`,
              }}
            >
              BOTT
            </div>
            <div
              style={{
                marginTop: 10,
                fontFamily: LABEL,
                fontSize: "clamp(11px, 2.2vw, 16px)",
                letterSpacing: "0.32em",
                color: VERDE,
                textShadow: "0 0 10px rgba(0,255,102,.6)",
              }}
            >
              // ASSISTENTE PESSOAL DE P3
            </div>
          </div>
          <div
            style={{
              fontFamily: LABEL,
              fontSize: "clamp(10px, 1.7vw, 13px)",
              lineHeight: 1.85,
              letterSpacing: "0.08em",
              whiteSpace: "pre",
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            {ENTRADA_LINHAS.map((l, i) => (
              <div
                key={i}
                style={{
                  color: l.tom === "ambar" ? AMBAR : "rgba(0,255,102,.82)",
                  textShadow: l.tom === "ambar" ? "0 0 8px rgba(255,176,0,.6)" : "0 0 6px rgba(0,255,102,.4)",
                  animation: l.tom === "ambar" ? "ent-tremor .18s steps(2) infinite" : undefined,
                }}
              >
                {l.texto}
              </div>
            ))}
          </div>
        </div>

        <div className="ent-voo">
          <div className="ent-rastro" />
          <div className="ent-abelha">
            <AbelhaPixel largura={largura} asaMs={50} />
          </div>
        </div>

        <div className="ent-faixas" />
      </div>

      {pulavel && <div className="bh-pular">CLIQUE OU ESC PARA PULAR</div>}
    </div>
  );
}
