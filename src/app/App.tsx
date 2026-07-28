import React, { useState, useEffect, useRef } from "react";
import { FAGULHAS, buildFileContent, type FagulhaData } from "./fagulhas-data";

const NEON = "#00FF66";
const NEON_MID = "#2BEA7B";
const NEON_DIM = "#0A3B23";
const PHOTO_BG = "#e4e4e4";
const TOP_BAR = 38;
const BOT_BAR = 28;

const MODULES = FAGULHAS;
const FILE_CONTENTS = FAGULHAS.map((f) => buildFileContent(f));

function playBeep(freq = 800, dur = 0.05, vol = 0.04) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = "square";
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {}
}

function playError() {
  playBeep(220, 0.15, 0.06);
  setTimeout(() => playBeep(180, 0.2, 0.05), 120);
}

function playSuccess() {
  playBeep(440, 0.08, 0.04);
  setTimeout(() => playBeep(660, 0.08, 0.04), 80);
  setTimeout(() => playBeep(880, 0.12, 0.04), 160);
}

function useUptime() {
  const [uptime, setUptime] = useState("12:48:22");
  useEffect(() => {
    let s = 46102;
    const iv = setInterval(() => {
      s++;
      setUptime(
        [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
          .map((n) => n.toString().padStart(2, "0"))
          .join(":")
      );
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return uptime;
}

function useRollingHex(count = 16) {
  const [hex, setHex] = useState(() =>
    Array.from({ length: count }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, "0").toUpperCase()
    ).join(" ")
  );
  useEffect(() => {
    const iv = setInterval(() => {
      setHex(
        Array.from({ length: count }, () =>
          Math.floor(Math.random() * 256).toString(16).padStart(2, "0").toUpperCase()
        ).join(" ")
      );
    }, 450);
    return () => clearInterval(iv);
  }, [count]);
  return hex;
}

// ── CRT OVERLAYS ──────────────────────────────────────────────────────────

function CRTOverlays() {
  return (
    <>
      {/* Noise */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 50,
          mixBlendMode: "overlay",
          opacity: 0.45,
          backgroundRepeat: "repeat",
          backgroundSize: "240px 240px",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Scanlines */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 51,
          backgroundImage:
            "repeating-linear-gradient(to bottom,transparent 0,transparent 2px,rgba(0,0,0,0.13) 2px,rgba(0,0,0,0.13) 4px)",
          animation: "scanroll 0.13s linear infinite",
        }}
      />
      {/* Vignette */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 52,
          background:
            "radial-gradient(ellipse at 50% 50%,transparent 28%,rgba(0,0,0,.52) 68%,rgba(0,0,0,.92) 100%)",
        }}
      />
      {/* Flicker */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 53,
          animation: "flicker 9s linear infinite",
        }}
      />
    </>
  );
}

// ── FILE ICON ─────────────────────────────────────────────────────────────

function FileIcon({
  mod,
  onClick,
  isSelected,
  isHidden,
}: {
  mod: (typeof MODULES)[0];
  onClick: () => void;
  isSelected: boolean;
  isHidden: boolean;
}) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        opacity: isHidden ? 0 : 1,
        transition: "opacity 0.4s ease",
        userSelect: "none",
      }}
    >
      {/* Icon body */}
      <div
        style={{
          position: "relative",
          width: 64,
          height: 80,
          transition: "transform 0.2s ease, filter 0.2s ease",
          transform: hov ? "translateY(-4px) scale(1.06)" : "none",
          filter: hov
            ? `drop-shadow(0 0 14px ${NEON}) drop-shadow(0 0 28px rgba(0,255,102,0.35))`
            : `drop-shadow(0 0 4px rgba(0,255,102,0.3))`,
        }}
      >
        {/* Main page body */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: "polygon(0 0, 74% 0, 100% 26%, 100% 100%, 0 100%)",
            background: "rgba(3,10,6,0.95)",
            border: `1px solid ${hov ? NEON : "rgba(0,255,102,0.4)"}`,
            transition: "border-color 0.2s ease",
          }}
        />
        {/* Dog-ear triangle */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 17,
            height: 21,
            background: hov ? "rgba(0,255,102,0.25)" : "rgba(0,255,102,0.1)",
            clipPath: "polygon(0 0, 100% 100%, 100% 0)",
            transition: "background 0.2s ease",
          }}
        />
        {/* Dog-ear border line */}
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 0,
            width: 17,
            height: 1,
            background: hov ? NEON : "rgba(0,255,102,0.35)",
            transition: "background 0.2s ease",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 16,
            width: 1,
            height: 21,
            background: hov ? NEON : "rgba(0,255,102,0.35)",
            transition: "background 0.2s ease",
          }}
        />

        {/* Content lines inside icon */}
        <div style={{ position: "absolute", top: 30, left: 8, right: 8, display: "flex", flexDirection: "column", gap: 5 }}>
          {[100, 80, 90, 60].map((w, li) => (
            <div key={li} style={{ height: 2, width: `${w}%`, background: hov ? "rgba(0,255,102,0.5)" : "rgba(0,255,102,0.2)", borderRadius: 1 }} />
          ))}
        </div>

        {/* Lock indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: "50%",
            transform: "translateX(-50%)",
            color: hov ? NEON : "rgba(0,255,102,0.4)",
            fontSize: 10,
            fontFamily: "'Share Tech Mono',monospace",
            transition: "color 0.2s ease",
          }}
        >
          ■
        </div>
      </div>

      {/* File name */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            color: hov ? NEON : NEON_MID,
            fontFamily: "'VT323',monospace",
            fontSize: 15,
            letterSpacing: "0.08em",
            transition: "color 0.2s ease",
            textShadow: hov ? `0 0 10px ${NEON}` : "none",
          }}
        >
          {mod.label}
        </div>
        <div style={{ color: NEON_DIM, fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: "0.1em", marginTop: 1 }}>
          {mod.size} · {mod.level}
        </div>
      </div>
    </div>
  );
}

// ── CLASSIFIED PHOTO ──────────────────────────────────────────────────────

function ClassifiedPhoto({
  label,
  src,
  alt,
}: {
  label: string;
  src: string;
  alt: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          color: NEON_DIM,
          fontFamily: "'Share Tech Mono',monospace",
          fontSize: 8,
          letterSpacing: "0.18em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          background: PHOTO_BG,
          border: "1px solid rgba(0,255,102,0.28)",
          padding: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 140,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
        }}
      >
        <img
          src={src}
          alt={alt}
          style={{
            maxWidth: "100%",
            maxHeight: 160,
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}

// ── INFO PANEL ─────────────────────────────────────────────────────────────

function InfoPanel({
  selectedId,
  onReturn,
}: {
  selectedId: number;
  onReturn: () => void;
}) {
  const [typedText, setTypedText] = useState("");
  const [cursor, setCursor] = useState(true);
  const typeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const content = FILE_CONTENTS[selectedId];
  const mod = FAGULHAS[selectedId];

  useEffect(() => {
    let i = 0;
    setTypedText("");
    const type = () => {
      if (i <= content.length) {
        setTypedText(content.slice(0, i));
        i++;
        const ch = content[i - 1];
        typeRef.current = setTimeout(type, ch === "\n" ? 10 : Math.random() * 14 + 20);
      }
    };
    typeRef.current = setTimeout(type, 150);
    return () => { if (typeRef.current) clearTimeout(typeRef.current); };
  }, [content]);

  useEffect(() => {
    const iv = setInterval(() => setCursor((c) => !c), 520);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [typedText]);


  return (
    <div
      style={{
        position: "fixed",
        top: TOP_BAR + 8,
        bottom: BOT_BAR + 8,
        left: "4%",
        right: "4%",
        display: "flex",
        flexDirection: "column",
        zIndex: 40,
        animation: "panel-in 0.4s cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "5px 14px",
          background: "rgba(0,255,102,0.05)",
          border: "1px solid rgba(0,255,102,0.38)",
          borderBottom: "none",
          flexShrink: 0,
        }}
      >
        <div style={{ color: NEON, fontSize: 9, letterSpacing: "0.17em", display: "flex", gap: 10, fontFamily: "'Share Tech Mono',monospace" }}>
          <span>■ REGISTRO CLASSIFICADO</span>
          <span style={{ color: NEON_MID }}>// {mod.label}</span>
          <span style={{ color: NEON_DIM }}>// {mod.codename}</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 8, color: NEON_DIM, fontFamily: "'Share Tech Mono',monospace" }}>
          <span style={{ letterSpacing: "0.12em" }}>MODO LEITURA SEGURA</span>
          <span style={{ color: NEON, animation: "blink 1s step-end infinite" }}>●</span>
        </div>
      </div>

      {/* Body — dossiê: fotos à esquerda, texto à direita */}
      <div
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
          background: "rgba(2,5,3,0.93)",
          border: "1px solid rgba(0,255,102,0.22)",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Coluna de fotos */}
        <div
          style={{
            width: 240,
            flexShrink: 0,
            padding: "16px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            borderRight: "1px solid rgba(0,255,102,0.18)",
            background: "rgba(0,255,102,0.02)",
          }}
        >
          <ClassifiedPhoto
            label="ANEXO A // ARTWORK"
            src={mod.artwork}
            alt={`Artwork ${mod.label}`}
          />
          <ClassifiedPhoto
            label="ANEXO B // LÂMPADA"
            src={mod.lampada}
            alt={`Lâmpada ${mod.label}`}
          />
        </div>

        {/* Coluna de texto */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            scrollbarWidth: "none",
          }}
        >
          <pre
            style={{
              fontFamily: "'Share Tech Mono','JetBrains Mono',monospace",
              fontSize: 11,
              lineHeight: 1.75,
              color: NEON_MID,
              whiteSpace: "pre-wrap",
              margin: 0,
            }}
          >
            {typedText}
            <span style={{ color: NEON, opacity: cursor ? 1 : 0 }}>█</span>
          </pre>
        </div>
      </div>

      {/* Return */}
      <button
        onClick={onReturn}
        style={{
          position: "absolute",
          bottom: -44,
          left: 0,
          fontFamily: "'Share Tech Mono',monospace",
          fontSize: 11,
          letterSpacing: "0.18em",
          color: NEON,
          background: "rgba(2,5,3,0.95)",
          border: "1px solid rgba(0,255,102,0.28)",
          padding: "6px 18px",
          cursor: "pointer",
          zIndex: 30,
          transition: "border-color 0.2s,box-shadow 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = NEON;
          e.currentTarget.style.boxShadow = `0 0 18px rgba(0,255,102,0.28)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(0,255,102,0.28)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        &lt; VOLTAR
      </button>
    </div>
  );
}

// ── MELT EFFECT ───────────────────────────────────────────────────────────

const GLITCH_CHARS = "█▓▒░╳╬╪╫╦╩╗╔╚╝║═▀▄■□▪▫●○◘◙♦♠♣";

function MeltOverlay({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);
  const [glitchLines, setGlitchLines] = useState<{ y: number; text: string; x: number }[]>([]);
  const [alertMsg, setAlertMsg] = useState("");
  const [opacity, setOpacity] = useState(1);
  const [meltY, setMeltY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const ALERTS = [
    "INTRUSÃO DETECTADA",
    "VIOLAÇÃO DO SISTEMA",
    "ACESSO NÃO AUTORIZADO",
    "PROTOCOLO ZERO ATIVADO",
    "AUTO-DESTRUIÇÃO INICIADA",
    "APAGANDO DADOS...",
    "DESLIGANDO SISTEMA...",
  ];

  useEffect(() => {
    // Phase 0: start glitch immediately
    const rand = () => ({
      y: Math.random() * 100,
      x: Math.random() * 80,
      text: Array.from({ length: Math.floor(Math.random() * 20 + 5) }, () =>
        GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
      ).join(""),
    });

    let alertIdx = 0;
    const glitchIv = setInterval(() => {
      setGlitchLines(Array.from({ length: 8 + Math.floor(Math.random() * 10) }, rand));
    }, 80);

    const alertIv = setInterval(() => {
      setAlertMsg(ALERTS[alertIdx % ALERTS.length]);
      alertIdx++;
    }, 400);

    // Phase 1: intensify and melt
    const t1 = setTimeout(() => {
      setPhase(1);
      let my = 0;
      const meltIv = setInterval(() => {
        my += 1.5;
        setMeltY(my);
        if (my >= 110) clearInterval(meltIv);
      }, 30);
    }, 800);

    // Phase 2: fade to black
    const t2 = setTimeout(() => {
      setPhase(2);
      let op = 1;
      const fadeIv = setInterval(() => {
        op -= 0.02;
        setOpacity(Math.max(0, op));
        if (op <= 0) { clearInterval(fadeIv); onDone(); }
      }, 30);
    }, 3200);

    return () => {
      clearInterval(glitchIv);
      clearInterval(alertIv);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Play glitch sounds
  useEffect(() => {
    const iv = setInterval(() => {
      playBeep(100 + Math.random() * 400, 0.06 + Math.random() * 0.1, 0.06);
    }, 150);
    return () => clearInterval(iv);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        overflow: "hidden",
        opacity,
        transition: "opacity 0.1s",
      }}
    >
      {/* Red-tinted background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,40,10,0.95)",
          animation: phase >= 1 ? "melt-bg 0.2s ease infinite" : "none",
        }}
      />

      {/* Melt effect — content slides down */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: phase >= 1 ? `translateY(${meltY}vh) scaleX(${1 + meltY / 200}) skewX(${Math.sin(meltY / 10) * 3}deg)` : "none",
          transformOrigin: "bottom center",
          transition: "transform 0.05s linear",
          background: "#020503",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: NEON, fontFamily: "'VT323',monospace", fontSize: 48, letterSpacing: "0.1em", textAlign: "center" }}>
          SISTEMA<br />COMPROMETIDO
        </div>
      </div>

      {/* Alert text center */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            color: "#FF0033",
            fontFamily: "'VT323',monospace",
            fontSize: 52,
            letterSpacing: "0.12em",
            textShadow: "0 0 20px #FF0033, 0 0 40px rgba(255,0,51,0.5)",
            animation: "blink 0.25s step-end infinite",
            textAlign: "center",
          }}
        >
          {alertMsg}
        </div>
        <div
          style={{
            color: NEON,
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: 12,
            letterSpacing: "0.2em",
            opacity: 0.7,
          }}
        >
          PROTOCOLO ZERO · ENCERRAMENTO FORÇADO · MEMÓRIA APAGADA
        </div>
      </div>

      {/* Glitch lines */}
      {glitchLines.map((line, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${line.y}%`,
            left: `${line.x}%`,
            color: Math.random() > 0.5 ? NEON : "#FF0033",
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: 11 + Math.random() * 10,
            opacity: 0.6 + Math.random() * 0.4,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {line.text}
        </div>
      ))}

      {/* Horizontal tear lines */}
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={`tear-${i}`}
          style={{
            position: "absolute",
            top: `${10 + i * 14}%`,
            left: 0,
            right: 0,
            height: `${1 + Math.random() * 4}px`,
            background: `rgba(0,255,102,${0.3 + Math.random() * 0.5})`,
            transform: `translateX(${Math.random() * 20 - 10}px)`,
            animation: `tear-move${i % 3} 0.1s linear infinite`,
            mixBlendMode: "screen",
          }}
        />
      ))}

      {/* Scanlines intensified */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(to bottom,transparent 0,transparent 1px,rgba(0,0,0,0.4) 1px,rgba(0,0,0,0.4) 2px)",
          pointerEvents: "none",
          animation: "scanroll 0.06s linear infinite",
        }}
      />
    </div>
  );
}

// ── PASSWORD SCREEN ────────────────────────────────────────────────────────

function PasswordScreen({ onSuccess, onTriesExhausted }: { onSuccess: () => void; onTriesExhausted: () => void }) {
  const [value, setValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [shake, setShake] = useState(false);
  const [phase, setPhase] = useState<"idle" | "wrong" | "success">("idle");
  const [cursor, setCursor] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const hexBar = useRollingHex(14);

  useEffect(() => {
    const iv = setInterval(() => setCursor((c) => !c), 530);
    return () => clearInterval(iv);
  }, []);

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const v = value.trim();
    if (v === "p3luche" || v === "P3LUCHE") {
      setPhase("success");
      playSuccess();
      setTimeout(onSuccess, 900);
      return;
    }

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    playError();
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setValue("");

    if (newAttempts >= 3) {
      setTimeout(onTriesExhausted, 600);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#020503",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: TOP_BAR,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 16px",
          background: "rgba(2,5,3,0.97)",
          borderBottom: "1px solid rgba(0,255,102,0.2)",
          zIndex: 110,
          fontFamily: "'Share Tech Mono',monospace",
        }}
      >
        <span style={{ color: NEON, fontFamily: "'VT323',monospace", fontSize: 20, letterSpacing: "0.08em" }}>■ SISTEMA SEGURO</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: NEON_MID, fontSize: 9, letterSpacing: "0.13em" }}>
          <span style={{ color: NEON, animation: "blink 2s step-end infinite" }}>●</span>
          AGUARDANDO AUTENTICAÇÃO
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ color: NEON_DIM, fontSize: 8 }}>{hexBar}</span>
        <span style={{ color: NEON_MID, fontSize: 9, letterSpacing: "0.12em" }}>ACESSO RESTRITO</span>
        <span style={{ color: NEON, fontSize: 9, animation: "blink 1.1s step-end infinite" }}>█ BLOQUEADO</span>
      </div>

      {/* Center auth box */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          animation: shake ? "shake 0.5s ease" : "none",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              color: NEON,
              fontFamily: "'VT323',monospace",
              fontSize: 48,
              letterSpacing: "0.12em",
              textShadow: `0 0 20px ${NEON}, 0 0 40px rgba(0,255,102,0.3)`,
              lineHeight: 1,
            }}
          >
            AUTENTICAÇÃO
          </div>
          <div style={{ color: NEON_MID, fontFamily: "'Share Tech Mono',monospace", fontSize: 10, letterSpacing: "0.25em", marginTop: 8 }}>
            SISTEMA DE ARQUIVOS CLASSIFICADOS // NÍVEL ALTO
          </div>
        </div>

        {/* Input area */}
        <div
          style={{
            border: `1px solid ${phase === "success" ? NEON : phase === "wrong" ? "#FF3333" : "rgba(0,255,102,0.45)"}`,
            padding: "14px 24px",
            minWidth: 340,
            background: "rgba(3,10,6,0.92)",
            boxShadow:
              phase === "success"
                ? `0 0 30px ${NEON}, 0 0 60px rgba(0,255,102,0.25)`
                : "0 0 12px rgba(0,255,102,0.1), inset 0 0 20px rgba(0,0,0,0.5)",
            transition: "border-color 0.3s, box-shadow 0.3s",
            position: "relative",
          }}
        >
          {/* Corner marks */}
          {[["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]].map(([v, h]) => (
            <div key={`${v}${h}`} style={{ position: "absolute", [v]: 4, [h]: 10, width: 10, height: 1, background: NEON, opacity: 0.5 }} />
          ))}

          <div style={{ color: NEON, fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: "0.2em", marginBottom: 10 }}>
            &gt; CÓDIGO DE ACESSO:
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              ref={inputRef}
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKey}
              maxLength={20}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: NEON,
                fontFamily: "'Share Tech Mono',monospace",
                fontSize: 18,
                letterSpacing: "0.2em",
                width: 280,
                caretColor: "transparent",
              }}
            />
            <span style={{ color: NEON, opacity: cursor ? 1 : 0, fontSize: 18 }}>█</span>
          </div>

          {/* Underline */}
          <div
            style={{
              height: 1,
              background: phase === "success" ? NEON : "rgba(0,255,102,0.3)",
              marginTop: 6,
              transition: "background 0.3s",
            }}
          />
        </div>

        {/* Confirm button */}
        <button
          onClick={handleSubmit}
          style={{
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: 11,
            letterSpacing: "0.22em",
            color: NEON,
            background: "rgba(2,5,3,0.95)",
            border: "1px solid rgba(0,255,102,0.3)",
            padding: "8px 40px",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = NEON;
            e.currentTarget.style.boxShadow = `0 0 18px rgba(0,255,102,0.3)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(0,255,102,0.3)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {phase === "success" ? "ACESSO CONCEDIDO" : "CONFIRMAR"}
        </button>

        {/* Attempt counter — only shows count, no hints */}
        {attempts > 0 && attempts < 3 && (
          <div
            style={{
              color: "rgba(255,51,51,0.6)",
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: 9,
              letterSpacing: "0.18em",
              animation: "blink 0.8s step-end 3",
            }}
          >
            TENTATIVA {attempts}/3
          </div>
        )}

        {/* Success text */}
        {phase === "success" && (
          <div
            style={{
              color: NEON,
              fontFamily: "'VT323',monospace",
              fontSize: 22,
              letterSpacing: "0.18em",
              textShadow: `0 0 16px ${NEON}`,
              animation: "blink 0.4s step-end 4",
            }}
          >
            ACESSO CONCEDIDO
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: BOT_BAR,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 16px",
          background: "rgba(2,5,3,0.97)",
          borderTop: "1px solid rgba(0,255,102,0.12)",
          zIndex: 110,
          fontFamily: "'Share Tech Mono',monospace",
        }}
      >
        <span style={{ color: NEON_DIM, fontSize: 8, letterSpacing: "0.1em" }}>SYS/v4.7.2</span>
        <span style={{ color: NEON_DIM, fontSize: 8, letterSpacing: "0.1em" }}>KERNEL 9.1.0-SECURE</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: "rgba(0,255,102,0.14)", fontSize: 7, animation: "blink 3.5s step-end infinite" }}>{hexBar}</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: NEON_DIM, fontSize: 8 }}>PROTO: ZETA-9</span>
      </div>
    </div>
  );
}

// ── MAIN TERMINAL ──────────────────────────────────────────────────────────

function MainTerminal() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const uptime = useUptime();
  const hexBar = useRollingHex(18);

  const handleFileClick = (id: number) => {
    if (showPanel) return;
    setSelectedId(id);
    setTimeout(() => setShowPanel(true), 50);
    playBeep(660, 0.06, 0.04);
  };

  const handleReturn = () => {
    setShowPanel(false);
    setTimeout(() => setSelectedId(null), 400);
    playBeep(440, 0.06, 0.04);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#020503",
        fontFamily: "'Share Tech Mono',monospace",
        cursor: "crosshair",
      }}
    >
      {/* Particles */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(i * 5.05) % 100}%`,
              top: `${(i * 6.3) % 100}%`,
              width: 1,
              height: `${(i % 5) + 2}px`,
              background: NEON,
              opacity: 0,
              animation: `particle-drift ${6 + (i % 5)}s linear ${-(i * 0.85)}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Top bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: TOP_BAR,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 16px",
          background: "rgba(2,5,3,0.97)",
          borderBottom: "1px solid rgba(0,255,102,0.2)",
          zIndex: 20,
        }}
      >
        <span style={{ color: NEON, fontFamily: "'VT323',monospace", fontSize: 20, letterSpacing: "0.08em" }}>■ SISTEMA ONLINE</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: NEON_MID, fontSize: 9, letterSpacing: "0.13em" }}>
          <span style={{ color: NEON, animation: "blink 2s step-end infinite" }}>●</span>
          CONEXÃO SEGURA
        </div>
        <span style={{ color: NEON_MID, fontSize: 9, letterSpacing: "0.12em" }}>NODE 04</span>
        <span style={{ color: NEON_MID, fontSize: 9, letterSpacing: "0.12em" }}>CRIPTOGRAFIA ATIVA</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: NEON_DIM, fontSize: 8 }}>{hexBar.slice(0, 17)}</span>
        <span style={{ color: NEON_MID, fontSize: 9, letterSpacing: "0.12em" }}>UPTIME {uptime}</span>
        <span style={{ color: NEON_MID, fontSize: 9 }}>VPN-9</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: NEON, fontSize: 9, letterSpacing: "0.14em" }}>
          <span style={{ animation: "blink 1.1s step-end infinite" }}>█</span>
          CLASSIFICADO
        </div>
      </div>

      {/* File browser area */}
      <div
        style={{
          position: "fixed",
          top: TOP_BAR,
          bottom: BOT_BAR,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          zIndex: 10,
          opacity: showPanel ? 0.05 : 1,
          transition: "opacity 0.45s ease",
          pointerEvents: showPanel ? "none" : "auto",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <div style={{ color: NEON_DIM, fontFamily: "'Share Tech Mono',monospace", fontSize: 9, letterSpacing: "0.25em", marginBottom: 6 }}>
            ■ ARQUIVOS CLASSIFICADOS // ACESSO NÍVEL ALPHA
          </div>
          <div style={{ height: 1, background: "rgba(0,255,102,0.15)", width: 400, margin: "0 auto" }} />
        </div>

        {/* 2 rows of 3 files */}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {[0, 1].map((row) => (
            <div key={row} style={{ display: "flex", gap: 52, justifyContent: "center" }}>
              {MODULES.slice(row * 3, row * 3 + 3).map((mod) => (
                <FileIcon
                  key={mod.id}
                  mod={mod}
                  onClick={() => handleFileClick(mod.id)}
                  isSelected={selectedId === mod.id}
                  isHidden={false}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{ color: "rgba(0,255,102,0.12)", fontFamily: "'Share Tech Mono',monospace", fontSize: 8, letterSpacing: "0.2em" }}>
          CLIQUE EM UM ARQUIVO PARA ACESSAR
        </div>
      </div>

      {/* Info panel */}
      {showPanel && selectedId !== null && (
        <InfoPanel selectedId={selectedId} onReturn={handleReturn} />
      )}

      {/* Bottom bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: BOT_BAR,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 16px",
          background: "rgba(2,5,3,0.97)",
          borderTop: "1px solid rgba(0,255,102,0.12)",
          zIndex: 20,
        }}
      >
        <span style={{ color: NEON_DIM, fontSize: 8, letterSpacing: "0.1em" }}>SYS/v4.7.2</span>
        <span style={{ color: NEON_DIM, fontSize: 8, letterSpacing: "0.1em" }}>KERNEL 9.1.0-SECURE</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: "rgba(0,255,102,0.14)", fontSize: 7, animation: "blink 3.5s step-end infinite" }}>{hexBar}</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: NEON_DIM, fontSize: 8 }}>DIRETRIZ 12 ATIVA</span>
        <span style={{ color: NEON_DIM, fontSize: 8 }}>PROTO: ZETA-9</span>
      </div>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────────

type Screen = "password" | "main" | "melting" | "closed";

export default function App() {
  const [screen, setScreen] = useState<Screen>("password");

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#020503" }}>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes flicker{0%,97%,100%{opacity:1}92%{opacity:.97}93%{opacity:.94}96%{opacity:.98}}
        @keyframes scanroll{0%{transform:translateY(0)}100%{transform:translateY(4px)}}
        @keyframes particle-drift{0%{transform:translateY(0);opacity:0}10%{opacity:.5}90%{opacity:.25}100%{transform:translateY(-70px);opacity:0}}
        @keyframes panel-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
        @keyframes melt-bg{0%,100%{filter:hue-rotate(0deg)}50%{filter:hue-rotate(30deg)}}
        @keyframes tear-move0{0%{transform:translateX(0)}100%{transform:translateX(-30px)}}
        @keyframes tear-move1{0%{transform:translateX(0)}100%{transform:translateX(20px)}}
        @keyframes tear-move2{0%{transform:translateX(0)}100%{transform:translateX(-15px)}}
        ::-webkit-scrollbar{display:none}
      `}</style>

      <CRTOverlays />

      {screen === "password" && (
        <PasswordScreen
          onSuccess={() => setScreen("main")}
          onTriesExhausted={() => setScreen("melting")}
        />
      )}

      {screen === "main" && <MainTerminal />}

      {screen === "melting" && (
        <MeltOverlay onDone={() => setScreen("closed")} />
      )}

      {screen === "closed" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 300,
          }}
        />
      )}
    </div>
  );
}
