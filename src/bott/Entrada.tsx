import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AbelhaPixel } from "../app/components/AbelhaPixel";
import {
  ENTRADA_LINHAS,
  ENTRADA_MS,
  SIGLA_BOAS_VINDAS,
  SIGLA_ENTRADA,
  SIGLA_LEMA,
  SIGLA_PUBLICA,
  SIGLA_SAUDACAO,
} from "../app/bott-data";
import { playBottSino } from "../app/sounds";
import { AMBAR, DISPLAY, LABEL, VERDE } from "./estilo";

// ============================================================================
// ENTRADA DO HUB — ~10,8 s (ENTRADA_MS)
// ============================================================================
// 1. Tela preta; uma abelha digital grande atravessa da esquerda para a
//    direita e o feixe de scan que ela arrasta revela as linhas de boot (a
//    revelação é um clip-path que anda junto com a abelha). Glitch curto no meio.
// 2. Cartão de orientação: a tela acende com uma piscada de lâmpada
//    fluorescente e, em fades lentos, entram as boas-vindas, a saudação, as
//    quatro linhas da sigla (inicial num hexágono de linha fina) e o lema. Um
//    único quadro desalinha o texto e volta. Sininho nas boas-vindas.
// 3. O cartão some e entra o cabeçalho "BOTT // ASSISTENTE PESSOAL DE P3";
//    fade para o hub.
// Da segunda visita em diante, clique ou Esc pula.
//
// Linha do tempo (ms) em TEMPO, logo abaixo.

const TEMPO = {
  vooInicio: 300,
  vooMs: 2800,
  bootSomeEm: 3000,
  cartaoEm: 3200, // piscada da lâmpada
  boasVindasEm: 3700,
  saudacaoEm: 4400,
  linhasEm: [5100, 5500, 5900, 6300],
  lemaEm: 7000,
  desalinhoEm: 7600,
  cartaoSaiEm: 8300,
  cabecalhoEm: 8600,
};
const FADE = { titulo: 1200, texto: 1400, linha: 1600, lema: 1800, cartaoSai: 1200, cabecalho: 1200 };
const FADE_FINAL_MS = 700;

const DE_VW = -30;
const ATE_VW = 115;
const GLITCH_ANIM_MS = 3600; // o glitch da varredura cai em ~46% disso

// A revelação acompanha a âncora: começa quando ela passa por 0vw e termina em 100vw.
const REVELA_INICIO = TEMPO.vooInicio + (TEMPO.vooMs * (0 - DE_VW)) / (ATE_VW - DE_VW);
const REVELA_MS = (TEMPO.vooMs * 100) / (ATE_VW - DE_VW);

// Pilha de fontes do sistema, sem serifa e sem mono.
const SANS = '"Helvetica Neue", Helvetica, Arial, "Segoe UI", system-ui, -apple-system, sans-serif';

const CSS = `
@keyframes ent-voo{from{transform:translateX(${DE_VW}vw)}to{transform:translateX(${ATE_VW}vw)}}
@keyframes ent-ondula{0%{transform:translate(-50%,calc(-50% - 6vh)) rotate(-5deg)}100%{transform:translate(-50%,calc(-50% + 6vh)) rotate(4deg)}}
@keyframes ent-revela{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes ent-glitch{0%,46%,49.5%,100%{transform:none;filter:none}46.5%{transform:translate(-10px,2px) skewX(-6deg);filter:drop-shadow(5px 0 #FF0040) drop-shadow(-5px 0 #00E5FF)}47.3%{transform:translate(8px,-3px);filter:drop-shadow(-6px 0 ${AMBAR}) drop-shadow(6px 0 #00E5FF) brightness(1.6)}48.1%{transform:translate(-4px,0) scaleY(1.04);filter:invert(1) hue-rotate(90deg)}48.9%{transform:translate(3px,1px);filter:drop-shadow(3px 0 #FF0040)}}
@keyframes ent-faixa{0%,46%,49.5%,100%{opacity:0}46.5%,48.6%{opacity:1}}
@keyframes ent-tremor{0%,100%{opacity:1}50%{opacity:.85}}
.ent-palco{position:absolute;inset:0;animation:ent-glitch ${GLITCH_ANIM_MS}ms linear both}
.ent-revela{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;clip-path:inset(0 100% 0 0);animation:ent-revela ${REVELA_MS}ms linear ${REVELA_INICIO}ms both}
.ent-voo{position:absolute;top:0;bottom:0;left:0;width:0;transform:translateX(${DE_VW}vw);animation:ent-voo ${TEMPO.vooMs}ms linear ${TEMPO.vooInicio}ms both}
.ent-rastro{position:absolute;top:0;bottom:0;right:0;width:38vw;background:linear-gradient(90deg,transparent 0%,rgba(0,255,102,.04) 55%,rgba(0,255,102,.16) 92%,rgba(220,255,230,.9) 99.6%,transparent 100%)}
.ent-rastro::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(to bottom,rgba(0,255,102,.22) 0 1px,transparent 1px 5px);-webkit-mask-image:linear-gradient(90deg,transparent 40%,#000);mask-image:linear-gradient(90deg,transparent 40%,#000)}
.ent-abelha{position:absolute;top:50%;left:0;color:#F4FFE8;filter:drop-shadow(0 0 6px rgba(0,255,102,.9)) drop-shadow(0 0 24px rgba(0,255,102,.35));animation:ent-ondula .85s ease-in-out infinite alternate}
.ent-faixas{position:absolute;inset:0;pointer-events:none;opacity:0;animation:ent-faixa ${GLITCH_ANIM_MS}ms linear both;background:linear-gradient(to bottom,transparent 22%,rgba(0,255,102,.25) 22% 24%,transparent 24% 61%,rgba(255,176,0,.3) 61% 62.5%,transparent 62.5% 78%,rgba(255,255,255,.2) 78% 79%,transparent 79%)}

.sg-tela{--sigla-fundo:#0e1c16;--sigla-texto:#f3e9c6;--sigla-linha:rgba(243,233,198,.3)}
@keyframes sg-lampada{0%{opacity:0}12%{opacity:.85}18%{opacity:.08}26%{opacity:.55}30%{opacity:.15}48%{opacity:1}100%{opacity:1}}
@keyframes sg-desalinho{0%{transform:translate(5px,-1px) skewX(-2deg)}12%,100%{transform:none}}
.sg-cartao{position:relative;background:var(--sigla-fundo);color:var(--sigla-texto);font-family:${SANS};border:1px solid var(--sigla-linha);box-shadow:inset 0 0 0 7px var(--sigla-fundo),inset 0 0 0 8px var(--sigla-linha);width:min(560px,100%);padding:clamp(32px,7vh,64px) clamp(26px,7vw,72px);display:flex;flex-direction:column;gap:clamp(18px,3.4vh,30px);text-align:left;-webkit-font-smoothing:antialiased}
.sg-acende{animation:sg-lampada .7s linear both}
.sg-desalinha{animation:sg-desalinho .6s steps(1) 1 both}
`;

/** Entra com fade lento (e um leve deslize para cima) a partir de `em`. */
function surge(t: number, em: number, ms: number): CSSProperties {
  const visivel = t >= em;
  return {
    opacity: visivel ? 1 : 0,
    transform: visivel ? "none" : "translateY(6px)",
    transition: `opacity ${ms}ms ease, transform ${ms}ms ease`,
  };
}

/**
 * `soSigla` (atalho de teste): começa direto no cartão, sem a abelha.
 */
export function Entrada({
  pulavel,
  onFim,
  soSigla = false,
}: {
  pulavel: boolean;
  onFim: () => void;
  soSigla?: boolean;
}) {
  const desvio = soSigla ? TEMPO.cartaoEm - 300 : 0;
  const [t, setT] = useState(desvio);
  const onFimRef = useRef(onFim);
  onFimRef.current = onFim;
  const largura = Math.round(Math.min(340, Math.max(170, window.innerWidth * 0.26)));

  // Relógio do cartão e do cabeçalho (a abelha anda por CSS).
  useEffect(() => {
    const t0 = performance.now();
    let tocou = false;
    const iv = setInterval(() => {
      const agora = desvio + performance.now() - t0;
      setT(agora);
      if (!tocou && agora >= TEMPO.boasVindasEm) {
        tocou = true;
        playBottSino();
      }
      if (agora >= ENTRADA_MS) {
        clearInterval(iv);
        onFimRef.current();
      }
    }, 40);
    return () => clearInterval(iv);
  }, [desvio]);

  useEffect(() => {
    if (!pulavel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFimRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pulavel]);

  const saindo = t >= ENTRADA_MS - FADE_FINAL_MS;
  const cartao = t >= TEMPO.cartaoEm;
  const cartaoSaindo = t >= TEMPO.cartaoSaiEm;
  const cabecalho = t >= TEMPO.cabecalhoEm;

  return (
    <div
      className="sg-tela"
      onClick={pulavel ? () => onFimRef.current() : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#000",
        overflow: "hidden",
        cursor: pulavel ? "pointer" : "default",
        opacity: saindo ? 0 : 1,
        transition: `opacity ${FADE_FINAL_MS}ms ease`,
      }}
    >
      <style>{CSS}</style>

      {/* 1. Abelha + linhas de boot */}
      {!soSigla && (
        <div className="ent-palco">
          <div className="ent-revela">
            <div
              style={{
                fontFamily: LABEL,
                fontSize: "clamp(10px, 1.7vw, 13px)",
                lineHeight: 1.85,
                letterSpacing: "0.08em",
                whiteSpace: "pre",
                maxWidth: "100%",
                overflow: "hidden",
                opacity: t >= TEMPO.bootSomeEm ? 0 : 1,
                transition: "opacity .5s ease",
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
      )}

      {/* 2. Cartão de orientação */}
      {cartao && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            pointerEvents: "none",
            opacity: cartaoSaindo ? 0 : 1,
            transition: `opacity ${FADE.cartaoSai}ms ease`,
          }}
        >
          <div className="sg-cartao sg-acende">
            <div
              className={t >= TEMPO.desalinhoEm ? "sg-desalinha" : undefined}
              style={{ display: "flex", flexDirection: "column", gap: "inherit" }}
            >
              <div style={{ ...surge(t, TEMPO.boasVindasEm, FADE.titulo), fontSize: "clamp(26px, 4.4vw, 36px)", fontWeight: 300, letterSpacing: "0.01em" }}>
                {SIGLA_BOAS_VINDAS}
              </div>
              <div style={{ ...surge(t, TEMPO.saudacaoEm, FADE.texto), fontSize: "clamp(14px, 2.2vw, 17px)", fontWeight: 300, opacity: t >= TEMPO.saudacaoEm ? 0.86 : 0 }}>
                {SIGLA_SAUDACAO}
              </div>

              <div aria-label={SIGLA_PUBLICA} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 6 }}>
                {SIGLA_ENTRADA.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      ...surge(t, TEMPO.linhasEm[i] ?? TEMPO.lemaEm, FADE.linha),
                      display: "flex",
                      alignItems: "center",
                      gap: 18,
                    }}
                  >
                    <HexInicial letra={s.letra} />
                    <span style={{ fontSize: "clamp(15px, 2.4vw, 19px)", fontWeight: 300, letterSpacing: "0.02em" }}>
                      {s.palavra}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  ...surge(t, TEMPO.lemaEm, FADE.lema),
                  opacity: t >= TEMPO.lemaEm ? 0.72 : 0,
                  marginTop: 6,
                  paddingTop: 18,
                  borderTop: "1px solid var(--sigla-linha)",
                  fontSize: 13,
                  fontWeight: 300,
                  letterSpacing: "0.04em",
                  lineHeight: 1.6,
                }}
              >
                {SIGLA_LEMA}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Cabeçalho */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            textAlign: "center",
            opacity: cabecalho ? 1 : 0,
            transform: cabecalho ? "none" : "translateY(10px)",
            transition: `opacity ${FADE.cabecalho}ms ease, transform ${FADE.cabecalho}ms ease`,
          }}
        >
          <div
            style={{
              fontFamily: DISPLAY,
              fontSize: "clamp(64px, 14vw, 140px)",
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
      </div>

      {pulavel && <div className="bh-pular">CLIQUE OU ESC PARA PULAR</div>}
    </div>
  );
}

/** Inicial maior, dentro de um hexágono de linha fina. */
function HexInicial({ letra }: { letra: string }) {
  return (
    <span style={{ position: "relative", width: 44, height: 40, flexShrink: 0, display: "inline-block" }}>
      <svg width={44} height={40} viewBox="0 0 44 40" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        <polygon points="11.5,1 32.5,1 43,20 32.5,39 11.5,39 1,20" fill="none" stroke="var(--sigla-texto)" strokeWidth={1} opacity={0.75} />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 21,
          fontWeight: 400,
        }}
      >
        {letra}
      </span>
    </span>
  );
}
