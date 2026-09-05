import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PLAYER_PHOTOS,
  HUNTER_WEST_PHOTO,
  HUNTER_WEST,
  CHARSETS,
  buildScannerFields,
  type ScannerField,
} from "../scanner-data";
import { playHunterWest, stopHunterWest } from "../sounds";

// ============================================================================
// SCANNER DE PLAYERS
// ============================================================================
// Loop automático e contínuo, sem nenhuma interação do usuário:
//
//   1. a foto entra com glitch (estática/ruído + fatiamento + split RGB);
//   2. um feixe de scan percorre a foto de cima para baixo, em repetição;
//   3. NOME / IDADE / DIMENSÃO DE ORIGEM são "digitados" caractere a caractere
//      e seguem embaralhando o tempo todo — o texto nunca se resolve;
//   4. depois de DISPLAY_DURATION a foto sai com o mesmo glitch e o painel
//      passa para a próxima foto da lista, em loop infinito.
//
// Fora dessa rotação existe o easter egg do Hunter West — ver o bloco
// "EASTER EGG" mais abaixo. As fotos e os valores falsos ficam em
// `../scanner-data.ts`.

// ── AJUSTES ────────────────────────────────────────────────────────────────
/** Quanto tempo (ms) cada foto fica na tela já estabilizada. */
const DISPLAY_DURATION = 6500;
/** Intervalo (ms) entre cada troca de caracteres do texto embaralhado. */
const SCRAMBLE_SPEED = 55;
/** Duração (ms) do glitch de entrada da foto. */
const GLITCH_IN_DURATION = 750;
/** Duração (ms) do glitch de saída da foto. */
const GLITCH_OUT_DURATION = 520;
/** Tempo (ms) por caractere na digitação inicial de cada campo. */
const TYPE_SPEED = 45;
/** Atraso (ms) entre o início da digitação de um campo e a do seguinte. */
const FIELD_STAGGER = 340;
/** Duração (ms) de uma passada completa do feixe de scan sobre a foto. */
const SCAN_SWEEP = 2400;

// ── AJUSTES DO EASTER EGG (HUNTER WEST) ────────────────────────────────────
/** Chance de ele entrar no lugar da próxima foto: 1 em N. */
const HUNTER_ODDS = 25;
/**
 * Primeiro ciclo da sessão em que o sorteio passa a valer. Com 2, o primeiro
 * scan que o visitante vê é sempre uma foto normal.
 */
const HUNTER_FIRST_ELIGIBLE_CYCLE = 2;
/** Bem mais curto que o padrão — a saída dele corta no meio de uma digitação. */
const HUNTER_DISPLAY_DURATION = 8000;
/** Passada do feixe travado (ele varre, recua e recomeça sem completar). */
const HUNTER_SCAN_SWEEP = 1700;
/** Ritmo (ms) do pisca-pisca da DIMENSÃO entre a espiral e o texto de erro. */
const HUNTER_BLINK_SPEED = 420;
/** Atraso (ms) até a quarta linha (exclusiva dele) começar a ser digitada. */
const HUNTER_EXTRA_DELAY = 1150;
/** Ela é digitada bem mais rápido que os campos normais. */
const HUNTER_EXTRA_TYPE_SPEED = 18;
/** Tempo (ms) com a linha inteira na tela antes de ser apagada. */
const HUNTER_EXTRA_HOLD = 260;
/** Duração (ms) do apagamento com glitch. */
const HUNTER_EXTRA_ERASE = 240;
/** Pausa (ms) antes de a linha voltar a ser digitada do zero. */
const HUNTER_EXTRA_RETYPE_GAP = 150;

// ── DIMENSÕES / CORES ──────────────────────────────────────────────────────
const NEON = "#00FF66";
const NEON_MID = "#2BEA7B";
const NEON_DIM = "#0A3B23";
/** Vermelho do ciclo do Hunter West (feixe, mira e tinta da foto). */
const HUNTER_RED = "#FF2B36";
const PHOTO_W = 168;
const PHOTO_H = 212;
const BEAM_H = 68;

/** Caracteres usados para corromper a linha extra durante o apagamento. */
const CORRUPT_CHARS = "▓▒░█#@%&*§Ø";

type Phase = "in" | "live" | "out";
/**
 * Como o valor de um campo se comporta na tela:
 *   scramble → troca caracteres o tempo todo (padrão de todos os perfis)
 *   static   → digita e para, sem trocar mais nada (só o NOME do Hunter West)
 *   blink    → alterna entre dois textos fixos (só a DIMENSÃO dele)
 */
type FieldMode = "scramble" | "static" | "blink";
type PanelField = ScannerField & { mode: FieldMode };

/**
 * Reescreve o molde com caracteres sorteados. Os espaços do molde são
 * preservados para o bloco manter a silhueta de um valor plausível — todo o
 * resto é aleatório e muda a cada tick.
 */
function scramble(field: ScannerField, count: number): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    const c = field.template[i];
    out +=
      c === " "
        ? " "
        : field.charset[Math.floor(Math.random() * field.charset.length)];
  }
  return out;
}

/** Texto exibido em um campo, conforme o modo dele. */
function fieldText(field: PanelField, revealed: number, blinkOn: boolean): string {
  if (field.mode === "static") return field.template.slice(0, revealed);
  if (field.mode === "blink") {
    // Alternância binária entre os dois estados — nada de caractere aleatório.
    return (blinkOn ? HUNTER_WEST.espiral : HUNTER_WEST.erro).slice(0, revealed);
  }
  return scramble(field, revealed);
}

/**
 * Estado da quarta linha do Hunter West ao longo do ciclo: digita rápido,
 * segura, some corroída por glitch e volta a digitar do zero — é essa segunda
 * digitação que o glitch de saída corta no meio.
 */
function hunterExtraState(elapsed: number): { text: string; erasing: boolean } {
  const full = HUNTER_WEST.extra;
  const typeEnd = HUNTER_EXTRA_DELAY + full.length * HUNTER_EXTRA_TYPE_SPEED;
  const eraseStart = typeEnd + HUNTER_EXTRA_HOLD;
  const eraseEnd = eraseStart + HUNTER_EXTRA_ERASE;
  const retypeStart = eraseEnd + HUNTER_EXTRA_RETYPE_GAP;

  if (elapsed < HUNTER_EXTRA_DELAY) return { text: "", erasing: false };

  if (elapsed < eraseStart) {
    const n = Math.min(
      full.length,
      Math.floor((elapsed - HUNTER_EXTRA_DELAY) / HUNTER_EXTRA_TYPE_SPEED)
    );
    return { text: full.slice(0, n), erasing: false };
  }

  if (elapsed < eraseEnd) {
    const done = (elapsed - eraseStart) / HUNTER_EXTRA_ERASE;
    const kept = full.slice(0, Math.max(0, Math.round(full.length * (1 - done))));
    const corrupted = kept
      .split("")
      .map((c) =>
        c === " " || Math.random() > 0.45
          ? c
          : CORRUPT_CHARS[Math.floor(Math.random() * CORRUPT_CHARS.length)]
      )
      .join("");
    return { text: corrupted, erasing: true };
  }

  if (elapsed < retypeStart) return { text: "", erasing: false };

  const n = Math.min(
    full.length,
    Math.floor((elapsed - retypeStart) / HUNTER_EXTRA_TYPE_SPEED)
  );
  return { text: full.slice(0, n), erasing: false };
}

export function PlayerScanner() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("in");
  const [isHunter, setIsHunter] = useState(false);
  // Só serve para forçar o re-render que reembaralha os caracteres.
  const [, setTick] = useState(0);
  const liveStart = useRef(0);
  // Ciclo atual da sessão. Começa em 1: o easter egg nunca cai no primeiro.
  const cycle = useRef(1);

  const photo = isHunter
    ? (HUNTER_WEST_PHOTO as string)
    : PLAYER_PHOTOS[index % PLAYER_PHOTOS.length];
  const displayDuration = isHunter ? HUNTER_DISPLAY_DURATION : DISPLAY_DURATION;
  const glitching = phase !== "live";
  // O Hunter West nunca estabiliza: a imagem segue corrompendo durante todo o
  // tempo em que ele está na tela, não só nas entradas e saídas.
  const corrupted = glitching || isHunter;
  const accent = isHunter ? HUNTER_RED : NEON;

  const fields = useMemo<PanelField[]>(() => {
    if (isHunter) {
      return [
        // O único nome do painel que se resolve e fica limpo — de propósito.
        { label: "NOME", template: HUNTER_WEST.nome, charset: CHARSETS.nome, mode: "static" },
        { label: "IDADE", template: HUNTER_WEST.idadeTemplate, charset: CHARSETS.idade, mode: "scramble" },
        // O molde aqui só define quantos caracteres a digitação inicial revela.
        { label: "DIMENSÃO DE ORIGEM", template: HUNTER_WEST.erro, charset: CHARSETS.dimensao, mode: "blink" },
      ];
    }
    return buildScannerFields().map((f) => ({ ...f, mode: "scramble" as const }));
  }, [index, isHunter]);

  // Máquina de estados do ciclo: in → live → out → (próxima foto).
  useEffect(() => {
    if (phase === "in") {
      const t = setTimeout(() => {
        liveStart.current = Date.now();
        setPhase("live");
      }, GLITCH_IN_DURATION);
      return () => clearTimeout(t);
    }
    if (phase === "live") {
      const t = setTimeout(() => setPhase("out"), displayDuration);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      cycle.current += 1;
      const hunterNext =
        HUNTER_WEST_PHOTO !== null &&
        cycle.current >= HUNTER_FIRST_ELIGIBLE_CYCLE &&
        Math.floor(Math.random() * HUNTER_ODDS) === 0;
      // Quando ele entra, a pool não avança: a foto de quem ele "roubou" o
      // lugar é a próxima a aparecer, então nenhum convidado é pulado.
      if (!hunterNext) setIndex((i) => (i + 1) % PLAYER_PHOTOS.length);
      setIsHunter(hunterNext);
      setPhase("in");
    }, GLITCH_OUT_DURATION);
    return () => clearTimeout(t);
  }, [phase, index, isHunter, displayDuration]);

  // Batida única do embaralhamento — roda enquanto o painel estiver montado.
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), SCRAMBLE_SPEED);
    return () => clearInterval(iv);
  }, []);

  // Som do easter egg: começa junto com o ciclo dele e é cortado na saída.
  useEffect(() => {
    if (!isHunter) return;
    playHunterWest();
    return () => stopHunterWest();
  }, [isHunter]);

  // Progresso da digitação, derivado do tempo decorrido na fase "live".
  // Na saída, o perfil normal termina de se escrever; o do Hunter West congela
  // onde estava, para o glitch cortar no meio da linha.
  const elapsed =
    phase === "in"
      ? 0
      : phase === "out"
      ? isHunter
        ? displayDuration
        : Infinity
      : Date.now() - liveStart.current;
  const finiteElapsed = Number.isFinite(elapsed) ? elapsed : displayDuration;
  const progress = Math.min(1, Math.max(0, elapsed / displayDuration));
  const blinkOn = Math.floor(finiteElapsed / HUNTER_BLINK_SPEED) % 2 === 0;
  const extra = isHunter ? hunterExtraState(finiteElapsed) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <style>{`
        @keyframes scn-glitch-in{
          0%{opacity:0;transform:translate(-14px,0) scaleY(1.9);clip-path:inset(46% 0 44% 0);filter:brightness(2.6) contrast(2.2)}
          14%{opacity:1;transform:translate(12px,-2px) scaleY(1.1);clip-path:inset(0 0 64% 0);filter:brightness(1.8) contrast(1.7)}
          28%{transform:translate(-16px,3px) scaleY(1);clip-path:inset(58% 0 8% 0);filter:brightness(1.3) contrast(1.5) hue-rotate(60deg)}
          42%{transform:translate(9px,-4px);clip-path:inset(22% 0 36% 0);filter:brightness(1.6) contrast(1.3)}
          58%{transform:translate(-6px,2px);clip-path:inset(72% 0 0 0);filter:none}
          70%{transform:translate(4px,0);clip-path:inset(0 0 18% 0)}
          84%{transform:translate(-2px,1px);clip-path:inset(9% 0 0 0)}
          100%{opacity:1;transform:none;clip-path:inset(0 0 0 0);filter:none}
        }
        @keyframes scn-glitch-out{
          0%{opacity:1;transform:none;clip-path:inset(0 0 0 0)}
          18%{transform:translate(-11px,2px);clip-path:inset(0 0 52% 0);filter:brightness(1.7) contrast(1.6)}
          34%{transform:translate(15px,-3px);clip-path:inset(48% 0 12% 0);filter:brightness(1.2) hue-rotate(-50deg)}
          52%{transform:translate(-18px,4px);clip-path:inset(16% 0 40% 0)}
          72%{opacity:.8;transform:translate(10px,0) scaleY(1.3);clip-path:inset(64% 0 0 0);filter:brightness(2.4)}
          100%{opacity:0;transform:translate(-20px,0) scaleY(2.4);clip-path:inset(48% 0 46% 0);filter:brightness(3)}
        }
        /* Ciclo do Hunter West: a imagem nunca assenta, fica pulsando entre
           nítida e corrompida do começo ao fim. */
        @keyframes scn-hunter-unstable{
          0%,100%{transform:none;clip-path:inset(0 0 0 0);filter:grayscale(1) contrast(1.15) brightness(0.92)}
          4%{transform:translate(-9px,1px);clip-path:inset(0 0 58% 0);filter:grayscale(1) contrast(1.9) brightness(1.7)}
          8%{transform:translate(7px,-2px);clip-path:inset(42% 0 20% 0);filter:grayscale(1) contrast(1.4) brightness(1.2)}
          11%{transform:none;clip-path:inset(0 0 0 0);filter:grayscale(1) contrast(1.15) brightness(0.92)}
          33%{transform:none;clip-path:inset(0 0 0 0)}
          36%{transform:translate(11px,2px);clip-path:inset(64% 0 4% 0);filter:grayscale(1) contrast(2.1) brightness(1.8)}
          40%{transform:translate(-6px,-3px);clip-path:inset(12% 0 52% 0)}
          44%{transform:none;clip-path:inset(0 0 0 0);filter:grayscale(1) contrast(1.15) brightness(0.92)}
          64%{transform:none;clip-path:inset(0 0 0 0)}
          68%{transform:translate(-13px,3px);clip-path:inset(30% 0 34% 0);filter:grayscale(1) brightness(2.2) contrast(1.6)}
          72%{transform:translate(9px,0);clip-path:inset(0 0 70% 0)}
          76%{transform:none;clip-path:inset(0 0 0 0);filter:grayscale(1) contrast(1.15) brightness(0.92)}
          90%{transform:translate(-4px,1px);clip-path:inset(50% 0 28% 0);filter:grayscale(1) contrast(1.8) brightness(1.5)}
          94%{transform:none;clip-path:inset(0 0 0 0);filter:grayscale(1) contrast(1.15) brightness(0.92)}
        }
        @keyframes scn-rgb-a{
          0%,100%{transform:translate(-7px,1px);clip-path:inset(0 0 58% 0)}
          25%{transform:translate(8px,-2px);clip-path:inset(38% 0 22% 0)}
          50%{transform:translate(-10px,3px);clip-path:inset(66% 0 4% 0)}
          75%{transform:translate(5px,0);clip-path:inset(12% 0 48% 0)}
        }
        @keyframes scn-rgb-b{
          0%,100%{transform:translate(8px,-2px);clip-path:inset(52% 0 10% 0)}
          25%{transform:translate(-9px,2px);clip-path:inset(6% 0 62% 0)}
          50%{transform:translate(11px,-3px);clip-path:inset(30% 0 34% 0)}
          75%{transform:translate(-4px,1px);clip-path:inset(70% 0 0 0)}
        }
        @keyframes scn-static{
          0%{background-position:0 0}
          20%{background-position:-90px 40px}
          40%{background-position:70px -60px}
          60%{background-position:-40px 90px}
          80%{background-position:110px 20px}
          100%{background-position:0 0}
        }
        @keyframes scn-beam{
          0%{transform:translateY(${-BEAM_H}px)}
          100%{transform:translateY(${PHOTO_H}px)}
        }
        /* Feixe travado: avança, recua, avança de novo e volta ao topo sem
           nunca chegar ao fim da foto. */
        @keyframes scn-beam-hunter{
          0%{transform:translateY(${-BEAM_H}px)}
          14%{transform:translateY(${Math.round(PHOTO_H * 0.22)}px)}
          22%{transform:translateY(${Math.round(PHOTO_H * 0.02)}px)}
          40%{transform:translateY(${Math.round(PHOTO_H * 0.49)}px)}
          48%{transform:translateY(${Math.round(PHOTO_H * 0.27)}px)}
          66%{transform:translateY(${Math.round(PHOTO_H * 0.75)}px)}
          74%{transform:translateY(${Math.round(PHOTO_H * 0.51)}px)}
          88%{transform:translateY(${Math.round(PHOTO_H * 0.9)}px)}
          94%{transform:translateY(${Math.round(PHOTO_H * 0.69)}px)}
          100%{transform:translateY(${-BEAM_H}px)}
        }
        @keyframes scn-hunter-erase{
          0%,100%{transform:translateX(0) skewX(0deg);opacity:1}
          25%{transform:translateX(-6px) skewX(-14deg);opacity:.6}
          50%{transform:translateX(7px) skewX(11deg);opacity:.9}
          75%{transform:translateX(-3px) skewX(-6deg);opacity:.45}
        }
        @keyframes scn-caret{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes scn-pulse{0%,100%{opacity:.35}50%{opacity:1}}
      `}</style>

      {/* Cabeçalho — mesmo padrão do cabeçalho dos Grupos */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            color: NEON_DIM,
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: 9,
            letterSpacing: "0.25em",
            marginBottom: 6,
          }}
        >
          ■ SCANNER DE PLAYERS // VARREDURA CONTÍNUA
        </div>
        <div
          style={{
            height: 1,
            background: "rgba(0,255,102,0.15)",
            width: 400,
            margin: "0 auto",
          }}
        />
      </div>

      {/* Painel */}
      <div
        style={{
          position: "relative",
          display: "flex",
          gap: 20,
          padding: 16,
          width: 560,
          maxWidth: "92vw",
          boxSizing: "border-box",
          background: "rgba(0,18,8,0.4)",
          border: "1px solid rgba(0,255,102,0.16)",
          boxShadow: isHunter
            ? "inset 0 0 40px rgba(255,43,54,0.09)"
            : "inset 0 0 40px rgba(0,255,102,0.05)",
          transition: "box-shadow 0.3s linear",
        }}
      >
        {/* Cantos do painel */}
        {(
          [
            { top: -1, left: -1, borderTop: `1px solid ${NEON}`, borderLeft: `1px solid ${NEON}` },
            { top: -1, right: -1, borderTop: `1px solid ${NEON}`, borderRight: `1px solid ${NEON}` },
            { bottom: -1, left: -1, borderBottom: `1px solid ${NEON}`, borderLeft: `1px solid ${NEON}` },
            { bottom: -1, right: -1, borderBottom: `1px solid ${NEON}`, borderRight: `1px solid ${NEON}` },
          ] as React.CSSProperties[]
        ).map((corner, i) => (
          <div key={i} style={{ position: "absolute", width: 10, height: 10, opacity: 0.7, ...corner }} />
        ))}

        {/* ── Foto ─────────────────────────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            width: PHOTO_W,
            height: PHOTO_H,
            flexShrink: 0,
            overflow: "hidden",
            background: "#050c08",
            border: `1px solid ${isHunter ? "rgba(255,43,54,0.4)" : "rgba(0,255,102,0.3)"}`,
          }}
        >
          {/* Camada principal + as duas cópias do split RGB (durante o glitch —
              e o ciclo inteiro, no caso do Hunter West) */}
          {(
            [
              { key: "main", blend: undefined, tint: "", anim: "" },
              { key: "r", blend: "screen", tint: "sepia(1) saturate(9) hue-rotate(-42deg)", anim: "scn-rgb-a" },
              { key: "b", blend: "screen", tint: "sepia(1) saturate(9) hue-rotate(150deg)", anim: "scn-rgb-b" },
            ] as {
              key: string;
              blend: React.CSSProperties["mixBlendMode"];
              tint: string;
              anim: string;
            }[]
          )
            .filter((layer) => layer.key === "main" || corrupted)
            .map((layer) => (
              <img
                key={`${layer.key}-${index}-${isHunter}`}
                src={photo}
                alt=""
                aria-hidden
                draggable={false}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter:
                    layer.key === "main"
                      ? "grayscale(1) contrast(1.15) brightness(0.92)"
                      : `grayscale(1) contrast(1.2) ${layer.tint}`,
                  mixBlendMode: layer.blend,
                  opacity:
                    layer.key === "main" ? 1 : glitching ? 0.55 : 0.3,
                  animation:
                    layer.key === "main"
                      ? phase === "in"
                        ? `scn-glitch-in ${GLITCH_IN_DURATION}ms steps(1,end) 1 both`
                        : phase === "out"
                        ? `scn-glitch-out ${GLITCH_OUT_DURATION}ms steps(1,end) 1 both`
                        : isHunter
                        ? "scn-hunter-unstable 1600ms steps(1,end) infinite"
                        : "none"
                      : `${layer.anim} ${glitching ? 190 : 320}ms steps(1,end) infinite`,
                }}
              />
            ))}

          {/* Tinta do terminal por cima da foto — vermelha no ciclo do easter egg */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: accent,
              mixBlendMode: "color",
              opacity: 0.42,
              pointerEvents: "none",
            }}
          />

          {/* Estática — forte no glitch, resíduo leve no resto do ciclo */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              mixBlendMode: "screen",
              opacity: glitching ? 0.55 : isHunter ? 0.34 : 0.12,
              transition: "opacity 0.18s linear",
              animation: "scn-static 240ms steps(1,end) infinite",
              backgroundRepeat: "repeat",
              backgroundSize: "180px 180px",
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='s'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23s)' opacity='0.5'/%3E%3C/svg%3E\")",
            }}
          />

          {/* Barras de rasgo horizontais */}
          {corrupted &&
            [18, 46, 74, 61].map((top, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `${top}%`,
                  height: 2 + (i % 3) * 3,
                  background: i % 2 ? "rgba(0,255,102,0.35)" : "rgba(190,255,214,0.5)",
                  mixBlendMode: "screen",
                  animation: `scn-rgb-${i % 2 ? "a" : "b"} ${140 + i * 30}ms steps(1,end) infinite`,
                }}
              />
            ))}

          {/* Feixe de scan — vermelho e travado no ciclo do Hunter West */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: BEAM_H,
              pointerEvents: "none",
              mixBlendMode: "screen",
              opacity: phase === "live" ? 1 : 0.25,
              background: isHunter
                ? "linear-gradient(to bottom, rgba(255,43,54,0) 0%, rgba(255,43,54,0.1) 45%, rgba(255,43,54,0.45) 88%, rgba(255,190,196,0.9) 97%, rgba(255,43,54,0) 100%)"
                : "linear-gradient(to bottom, rgba(0,255,102,0) 0%, rgba(0,255,102,0.08) 45%, rgba(0,255,102,0.38) 88%, rgba(190,255,214,0.9) 97%, rgba(0,255,102,0) 100%)",
              animation: isHunter
                ? `scn-beam-hunter ${HUNTER_SCAN_SWEEP}ms linear infinite`
                : `scn-beam ${SCAN_SWEEP}ms linear infinite`,
            }}
          />

          {/* Scanlines da foto */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage:
                "repeating-linear-gradient(to bottom,transparent 0,transparent 2px,rgba(0,0,0,0.28) 2px,rgba(0,0,0,0.28) 3px)",
            }}
          />

          {/* Retículo de mira */}
          {(
            [
              { top: 6, left: 6, borderTop: `1px solid ${accent}`, borderLeft: `1px solid ${accent}` },
              { top: 6, right: 6, borderTop: `1px solid ${accent}`, borderRight: `1px solid ${accent}` },
              { bottom: 6, left: 6, borderBottom: `1px solid ${accent}`, borderLeft: `1px solid ${accent}` },
              { bottom: 6, right: 6, borderBottom: `1px solid ${accent}`, borderRight: `1px solid ${accent}` },
            ] as React.CSSProperties[]
          ).map((corner, i) => (
            <div
              key={i}
              style={{ position: "absolute", width: 14, height: 14, opacity: 0.8, pointerEvents: "none", ...corner }}
            />
          ))}

          {/* Etiqueta do alvo */}
          <div
            style={{
              position: "absolute",
              left: 6,
              bottom: 6,
              color: accent,
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: 8,
              letterSpacing: "0.14em",
              textShadow: `0 0 8px ${accent}`,
            }}
          >
            {isHunter
              ? "ALVO ██/██"
              : `ALVO ${String((index % PLAYER_PHOTOS.length) + 1).padStart(2, "0")}/${String(
                  PLAYER_PHOTOS.length
                ).padStart(2, "0")}`}
          </div>
        </div>

        {/* ── Campos ───────────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 14,
          }}
        >
          {fields.map((field, i) => {
            const revealed = Math.max(
              0,
              Math.min(
                field.template.length,
                Math.floor((elapsed - i * FIELD_STAGGER) / TYPE_SPEED)
              )
            );
            const typing = revealed < field.template.length;
            const isBlink = field.mode === "blink";
            return (
              <div key={field.label}>
                <div
                  style={{
                    color: NEON_DIM,
                    fontFamily: "'Share Tech Mono',monospace",
                    fontSize: 8,
                    letterSpacing: "0.2em",
                    marginBottom: 3,
                  }}
                >
                  {field.label}
                </div>
                <div
                  style={{
                    color: isBlink ? HUNTER_RED : NEON,
                    // Fallbacks para a espiral, que a VT323 não desenha.
                    fontFamily: isBlink
                      ? "'VT323','Segoe UI Symbol','DejaVu Sans',monospace"
                      : "'VT323',monospace",
                    fontSize: 22,
                    lineHeight: 1,
                    letterSpacing: "0.06em",
                    textShadow: isBlink
                      ? "0 0 10px rgba(255,43,54,0.6)"
                      : "0 0 10px rgba(0,255,102,0.55)",
                    whiteSpace: "pre",
                    overflow: "hidden",
                    minHeight: 22,
                  }}
                >
                  {fieldText(field, revealed, blinkOn)}
                  {revealed > 0 && typing && (
                    <span style={{ animation: "scn-caret 0.5s step-end infinite" }}>█</span>
                  )}
                </div>
                <div style={{ height: 1, background: "rgba(0,255,102,0.12)", marginTop: 5 }} />
              </div>
            );
          })}

          {/* Quarta linha — só existe no perfil do Hunter West */}
          {extra && (
            <div
              style={{
                minHeight: 12,
                marginTop: -4,
                color: HUNTER_RED,
                fontFamily: "'Share Tech Mono',monospace",
                fontSize: 9,
                letterSpacing: "0.08em",
                whiteSpace: "pre",
                overflow: "hidden",
                textShadow: "0 0 8px rgba(255,43,54,0.5)",
                animation: extra.erasing
                  ? "scn-hunter-erase 90ms steps(1,end) infinite"
                  : "none",
              }}
            >
              {extra.text}
            </div>
          )}

          {/* Rodapé de status do ciclo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <span style={{ color: accent, fontSize: 8, animation: "scn-pulse 1.1s linear infinite" }}>●</span>
            <span
              style={{
                color: isHunter ? HUNTER_RED : NEON_MID,
                fontFamily: "'Share Tech Mono',monospace",
                fontSize: 8,
                letterSpacing: "0.14em",
              }}
            >
              {isHunter
                ? "SEM CORRESPONDÊNCIA"
                : glitching
                ? "REALINHANDO SINAL"
                : "DECRIPTOGRAFANDO"}
            </span>
            <div style={{ flex: 1, height: 2, background: "rgba(0,255,102,0.1)" }}>
              <div
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  height: "100%",
                  background: accent,
                  boxShadow: `0 0 6px ${accent}`,
                }}
              />
            </div>
            <span style={{ color: NEON_DIM, fontFamily: "'Share Tech Mono',monospace", fontSize: 8 }}>
              {String(Math.round(progress * 100)).padStart(3, "0")}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
