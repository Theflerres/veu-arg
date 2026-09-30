import { useEffect, useMemo, useState } from "react";
import type { GrupoData } from "../grupos-data";
import {
  getMembrosDoGrupo,
  MEMBRO_PLACEHOLDER,
  type Membro,
} from "../grupos-membros-data";
import { startHeartbeat, stopHeartbeat } from "../sounds";

// ============================================================================
// ARQUIVO DE GRUPO — destrancamento automático + ficha dos membros
// ============================================================================
// Fluxo: o campo de senha digita `grupo.senha` sozinho, caractere por
// caractere → "ACESSO CONCEDIDO" → grade com um card por membro (foto, monitor
// cardíaco em loop e placa de status). Os dados ficam em `grupos-data.ts` e
// `grupos-membros-data.ts`.

const NEON = "#00FF66";
const NEON_MID = "#2BEA7B";
const NEON_DIM = "#0A3B23";
const LOCK_RED = "#FF3333";
const MONO = "'Share Tech Mono',monospace";

/** Ritmo do auto-preenchimento. Mexa aqui para acelerar/desacelerar. */
const TIMING = {
  /** Pausa antes do primeiro caractere. */
  START_DELAY_MS: 900,
  /** Intervalo entre caracteres: base + variação aleatória (parece humano). */
  CHAR_BASE_MS: 85,
  CHAR_JITTER_MS: 110,
  /** Pausa entre o último caractere e o "ACESSO CONCEDIDO". */
  VERIFY_MS: 550,
  /** Quanto tempo o "ACESSO CONCEDIDO" fica na tela antes do conteúdo. */
  GRANTED_MS: 1500,
} as const;

type Fase = "digitando" | "concedido" | "conteudo";

export function GrupoArquivo({
  grupo,
  onReturn,
}: {
  grupo: GrupoData;
  onReturn: () => void;
}) {
  const [fase, setFase] = useState<Fase>("digitando");
  const [digitado, setDigitado] = useState("");
  const membros = useMemo(() => getMembrosDoGrupo(grupo.codename), [grupo.codename]);

  // Único som da tela: o batimento, em loop, do momento em que se entra até sair.
  useEffect(() => {
    startHeartbeat();
    return () => stopHeartbeat();
  }, []);

  // Auto-digitação da senha → concedido → conteúdo.
  useEffect(() => {
    setFase("digitando");
    setDigitado("");
    const timers: ReturnType<typeof setTimeout>[] = [];
    const senha = grupo.senha;

    let t = TIMING.START_DELAY_MS;
    for (let i = 1; i <= senha.length; i++) {
      timers.push(setTimeout(() => setDigitado(senha.slice(0, i)), t));
      t += TIMING.CHAR_BASE_MS + Math.random() * TIMING.CHAR_JITTER_MS;
    }
    t += TIMING.VERIFY_MS;
    timers.push(setTimeout(() => setFase("concedido"), t));
    t += TIMING.GRANTED_MS;
    timers.push(setTimeout(() => setFase("conteudo"), t));

    return () => timers.forEach(clearTimeout);
  }, [grupo.senha]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        // acima dos overlays de CRT e de qualquer widget: preto de verdade
        zIndex: 600,
        cursor: "default",
        fontFamily: MONO,
      }}
    >
      <style>{`
        @keyframes grupo-caret{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes grupo-fade-in{from{opacity:0}to{opacity:1}}
        @keyframes grupo-card-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes grupo-granted{0%{opacity:0;letter-spacing:.6em}30%{opacity:1}45%{opacity:.35}60%,100%{opacity:1;letter-spacing:.28em}}
        @keyframes ecg-sweep{from{left:0%}to{left:100%}}
        @keyframes ecg-beat{0%{transform:scale(1.35);opacity:1}35%,100%{transform:scale(1);opacity:.45}}
        @keyframes status-dot{0%,100%{opacity:1}50%{opacity:.25}}
      `}</style>

      {fase === "conteudo" ? (
        <ConteudoGrupo grupo={grupo} membros={membros} />
      ) : (
        <CampoSenha grupo={grupo} digitado={digitado} concedido={fase === "concedido"} />
      )}

      {/* Saída discreta */}
      <button
        onClick={onReturn}
        style={{
          position: "fixed",
          bottom: 20,
          left: 20,
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.22)",
          background: "transparent",
          border: "none",
          padding: 6,
          cursor: "pointer",
          transition: "color 0.2s ease",
          zIndex: 2,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.22)"; }}
      >
        &lt; VOLTAR
      </button>
    </div>
  );
}

// ── CAMPO DE SENHA (auto-digitação) ─────────────────────────────────────────

function LockIcon({ open, color }: { open: boolean; color: string }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="square"
      aria-hidden="true"
      style={{ flexShrink: 0, display: "block", transition: "stroke 0.3s ease" }}
    >
      <rect x="4" y="10.5" width="16" height="10.5" />
      {/* aberto: a haste sobe e se solta do lado direito */}
      <path d={open ? "M8 10.5V5.5a4 4 0 0 1 8 0" : "M8 10.5V7a4 4 0 0 1 8 0v3.5"} />
      <path d="M12 14.5v3" />
    </svg>
  );
}

function CampoSenha({
  grupo,
  digitado,
  concedido,
}: {
  grupo: GrupoData;
  digitado: string;
  concedido: boolean;
}) {
  const cor = concedido ? NEON : LOCK_RED;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: "0 16px",
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: "0.25em" }}>
        {grupo.label.toUpperCase()}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          border: `1px solid ${concedido ? "rgba(0,255,102,0.55)" : "rgba(255,51,51,0.35)"}`,
          boxShadow: concedido ? "0 0 18px rgba(0,255,102,0.18)" : "none",
          background: "#000",
          padding: "12px 18px",
          width: 340,
          maxWidth: "100%",
          transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        }}
      >
        <LockIcon open={concedido} color={concedido ? NEON : "rgba(255,51,51,0.75)"} />
        <div
          role="textbox"
          aria-readonly="true"
          aria-label={`Senha — ${grupo.label}`}
          style={{
            flex: 1,
            minHeight: 20,
            color: concedido ? NEON : "rgba(255,255,255,0.85)",
            fontSize: 16,
            letterSpacing: "0.2em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            transition: "color 0.3s ease",
          }}
        >
          {digitado}
          {!concedido && (
            <span style={{ color: cor, animation: "grupo-caret 0.8s step-end infinite" }}>▌</span>
          )}
        </div>
      </div>

      <div style={{ height: 28, display: "flex", alignItems: "center" }}>
        {concedido ? (
          <div
            style={{
              color: NEON,
              fontFamily: "'VT323',monospace",
              fontSize: 26,
              letterSpacing: "0.28em",
              textShadow: "0 0 10px rgba(0,255,102,0.6)",
              animation: "grupo-granted 0.7s ease-out both",
            }}
          >
            ACESSO CONCEDIDO
          </div>
        ) : (
          <div style={{ color: "rgba(255,51,51,0.55)", fontSize: 10, letterSpacing: "0.22em" }}>
            AUTENTICAÇÃO AUTOMÁTICA EM CURSO
            <span style={{ animation: "grupo-caret 1.2s step-end infinite" }}>...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CONTEÚDO: GRADE DE MEMBROS ──────────────────────────────────────────────

function ConteudoGrupo({ grupo, membros }: { grupo: GrupoData; membros: Membro[] }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflowY: "auto",
        animation: "grupo-fade-in 0.5s ease both",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 16px 72px" }}>
        {/* Cabeçalho */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: NEON_MID, fontSize: 9, letterSpacing: "0.25em", marginBottom: 6 }}>
            ■ ARQUIVO LIBERADO // ACESSO CONCEDIDO
          </div>
          <div
            style={{
              color: NEON,
              fontFamily: "'VT323',monospace",
              fontSize: 34,
              letterSpacing: "0.08em",
              lineHeight: 1,
              textShadow: "0 0 8px rgba(0,255,102,0.35)",
            }}
          >
            {grupo.label.toUpperCase()}
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8, color: NEON_MID, fontSize: 9, letterSpacing: "0.16em" }}>
            <span>{String(membros.length).padStart(2, "0")} REGISTROS</span>
            <span>SINAIS VITAIS: MONITORADOS</span>
            <span>NÍVEL {grupo.level}</span>
          </div>
          <div style={{ height: 1, background: "rgba(0,255,102,0.18)", marginTop: 14 }} />
        </div>

        {/* Grade */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))",
            gap: 14,
          }}
        >
          {membros.map((m, i) => (
            <MembroCard key={m.id} membro={m} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Hash simples e estável → cada card tem seu próprio BPM/fase, sem mudar a cada render. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function MembroCard({ membro, index }: { membro: Membro; index: number }) {
  const [src, setSrc] = useState(membro.foto ?? MEMBRO_PLACEHOLDER);

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: 10,
        border: "1px solid rgba(0,255,102,0.22)",
        background: "linear-gradient(180deg, rgba(0,255,102,0.04), rgba(0,255,102,0.01))",
        animation: `grupo-card-in 0.45s ease ${index * 70}ms both`,
        minWidth: 0,
      }}
    >
      {/* Foto */}
      <div
        style={{
          width: 88,
          height: 110,
          flexShrink: 0,
          border: "1px solid rgba(0,255,102,0.3)",
          background: "#0a160f",
          overflow: "hidden",
        }}
      >
        <img
          src={src}
          alt={membro.nome}
          loading="lazy"
          onError={() => setSrc(MEMBRO_PLACEHOLDER)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
        />
      </div>

      {/* Dados + monitor */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
          <span style={{ color: NEON_DIM, fontSize: 9, letterSpacing: "0.1em", flexShrink: 0 }}>
            #{String(index + 1).padStart(2, "0")}
          </span>
          <span
            title={membro.nome}
            style={{
              color: "#E6FFE9",
              fontFamily: "'VT323',monospace",
              fontSize: 22,
              lineHeight: 1,
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {membro.nome}
          </span>
        </div>

        <HeartMonitor seed={membro.id} />

        <StatusPlaca texto="Operante" />
      </div>
    </div>
  );
}

// ── HEART MONITOR ───────────────────────────────────────────────────────────
// Traço de ECG fixo (2 batimentos na largura) + uma "borracha" que varre da
// esquerda pra direita: a borda esquerda dela é a cabeça que "escreve" o traço,
// a área à frente fica apagada — como nos monitores de UTI. O ♥ pulsa no
// instante em que a cabeça passa pelo pico (onda R).

/** Um batimento em 100 unidades de largura; linha de base em y=26. */
const BEAT = "L18,26 Q23,20 28,26 L36,26 L39,30 L43,4 L47,36 L50,26 L60,26 Q68,17 76,26 L100,26";
const ECG_PATH = `M0,26 ${BEAT} ${BEAT.replace(/(\d+(?:\.\d+)?),(\d+)/g, (_, x, y) => `${Number(x) + 100},${y}`)}`;
/** Posição do pico R dentro da varredura (x=43 de 200). */
const R_PEAK_FRACTION = 43 / 200;

function HeartMonitor({ seed }: { seed: string }) {
  const { bpm, sweepS, delayS } = useMemo(() => {
    const h = hashString(seed);
    const bpm = 62 + (h % 34); // 62–95
    const sweepS = (2 * 60) / bpm; // 2 batimentos por varredura
    const delayS = -((h >>> 8) % 1000) / 1000 * sweepS; // fase aleatória
    return { bpm, sweepS, delayS };
  }, [seed]);

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          flex: 1,
          height: 46,
          overflow: "hidden",
          background: "#010805",
          border: "1px solid rgba(0,255,102,0.18)",
        }}
      >
        <svg
          viewBox="0 0 200 40"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            filter: "drop-shadow(0 0 2px rgba(0,255,102,0.9))",
          }}
        >
          <path
            d={ECG_PATH}
            fill="none"
            stroke={NEON}
            strokeWidth={1.6}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Borracha / cabeça de escrita */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "16%",
            background: "linear-gradient(to right, #010805 0%, #010805 70%, rgba(1,8,5,0.6) 85%, rgba(1,8,5,0) 100%)",
            animation: `ecg-sweep ${sweepS}s linear ${delayS}s infinite`,
          }}
        />

        {/* Grade de osciloscópio por cima de tudo */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(rgba(0,255,102,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,102,0.07) 1px, transparent 1px)",
            backgroundSize: "10px 10px",
          }}
        />
      </div>

      <div
        style={{
          width: 34,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: NEON,
            fontSize: 13,
            lineHeight: 1,
            display: "inline-block",
            textShadow: "0 0 6px rgba(0,255,102,0.8)",
            animation: `ecg-beat ${sweepS / 2}s ease-out ${delayS + R_PEAK_FRACTION * sweepS}s infinite`,
          }}
        >
          ♥
        </span>
        <span style={{ color: NEON, fontFamily: "'VT323',monospace", fontSize: 18, lineHeight: 1 }}>{bpm}</span>
        <span style={{ color: NEON_DIM, fontSize: 7, letterSpacing: "0.1em" }}>BPM</span>
      </div>
    </div>
  );
}

// ── PLACA DE STATUS ─────────────────────────────────────────────────────────

function StatusPlaca({ texto }: { texto: string }) {
  return (
    <div
      style={{
        alignSelf: "flex-start",
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "3px 10px",
        border: `1px solid ${NEON}`,
        background: "rgba(0,255,102,0.1)",
        color: NEON,
        fontSize: 10,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        boxShadow: "inset 0 0 8px rgba(0,255,102,0.15)",
      }}
    >
      <span style={{ width: 6, height: 6, background: NEON, borderRadius: "50%", boxShadow: `0 0 6px ${NEON}`, animation: "status-dot 1.6s ease-in-out infinite" }} />
      {texto}
    </div>
  );
}
