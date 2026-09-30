import { useEffect, useRef, useState } from "react";
import { PERFIS_SECRETOS, type PerfilSecreto } from "../arquivo-secreto-data";

// ============================================================================
// ARQUIVO SECRETO — easter egg + ficha em tela cheia
// ============================================================================
// Mesmo esquema do relógio do countdown (`TimerOverlay.tsx`): um ícone quase
// invisível que só acende no hover. Fica no canto superior esquerdo, longe do
// relógio (inferior direito), para os dois não se confundirem. Os dados dos
// perfis ficam em `arquivo-secreto-data.ts`.

const NEON = "#00FF66";
const NEON_MID = "#2BEA7B";
const NEON_DIM = "#0A3B23";
const LOCK_RED = "#FF3333";
const MONO = "'Share Tech Mono',monospace";

/**
 * Ritmo da digitação — o mesmo do texto das Fagulhas. Cada card digita seus
 * campos em sequência (nome → idade → dimensão → bio → notas → registros);
 * clicar no card completa o texto na hora.
 */
const TYPING = {
  /** Pausa antes do primeiro caractere (somada ao atraso de entrada do card). */
  START_DELAY_MS: 500,
  /** Intervalo entre caracteres: base + variação aleatória. */
  CHAR_BASE_MS: 20,
  CHAR_JITTER_MS: 14,
  /** Quebras de linha passam quase direto. */
  NEWLINE_MS: 10,
} as const;

/** Conta quantos caracteres de `texto` já foram "digitados". */
function useDigitacao(texto: string, atrasoMs: number) {
  const [n, setN] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let i = 0;
    setN(0);
    const tick = () => {
      i++;
      setN(i);
      if (i >= texto.length) return;
      const ch = texto[i - 1];
      timer.current = setTimeout(
        tick,
        ch === "\n" ? TYPING.NEWLINE_MS : TYPING.CHAR_BASE_MS + Math.random() * TYPING.CHAR_JITTER_MS
      );
    };
    timer.current = setTimeout(tick, atrasoMs + TYPING.START_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [texto, atrasoMs]);

  const completar = () => {
    if (timer.current) clearTimeout(timer.current);
    setN(texto.length);
  };

  return { n, completar, terminou: n >= texto.length };
}

/** Silhueta usada quando o perfil não tem foto (ex.: Austin). */
const FOTO_CENSURADA =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="420">` +
      `<rect width="340" height="420" fill="#0a0505"/>` +
      `<circle cx="170" cy="150" r="68" fill="#2a0c0c"/>` +
      `<ellipse cx="170" cy="420" rx="128" ry="160" fill="#2a0c0c"/>` +
      `<rect x="40" y="190" width="260" height="36" fill="#000"/>` +
      `<text x="170" y="215" font-family="monospace" font-size="18" fill="#7a1a1a" text-anchor="middle">[CENSURADO]</text>` +
      `</svg>`
  );

/** Ícone discreto no canto: quase invisível até o cursor chegar perto. */
export function ArquivoSecretoEasterEgg({ onOpen, top }: { onOpen: () => void; top: number }) {
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onFocus={() => setHov(true)}
      onBlur={() => setHov(false)}
      aria-label="Abrir arquivo"
      style={{
        position: "fixed",
        left: 10,
        top: top + 8,
        width: 26,
        height: 26,
        padding: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        zIndex: 25,
        opacity: hov ? 0.75 : 0.09,
        filter: hov ? `drop-shadow(0 0 5px ${NEON})` : "none",
        transition: "opacity 0.35s ease, filter 0.35s ease",
      }}
    >
      {/* pasta com espiral — aceno ao Espiralium */}
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke={NEON}
        strokeWidth={1.8}
        strokeLinecap="square"
        aria-hidden="true"
      >
        <path d="M2.5 5.5h7l2 2.5h10v12.5h-19z" />
        <path d="M12 14.2a1 1 0 1 1 1-1 2 2 0 1 1-2 2 3 3 0 1 1 3-3" />
      </svg>
    </button>
  );
}

export function ArquivoSecretoOverlay({ onClose }: { onClose: () => void }) {
  // Esc fecha, igual a sair pelo botão.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        // mesmo patamar da tela de Grupo: acima dos overlays de CRT
        zIndex: 600,
        cursor: "default",
        fontFamily: MONO,
      }}
    >
      <style>{`
        @keyframes secreto-fade-in{from{opacity:0}to{opacity:1}}
        @keyframes secreto-card-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes secreto-blink{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes secreto-caret{0%,100%{opacity:1}50%{opacity:0}}
      `}</style>

      <div style={{ position: "absolute", inset: 0, overflowY: "auto", animation: "secreto-fade-in 0.5s ease both" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 16px 72px" }}>
          {/* Cabeçalho */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: LOCK_RED, fontSize: 9, letterSpacing: "0.25em", marginBottom: 6, opacity: 0.8 }}>
              ■ ARQUIVO NÃO LISTADO // <span style={{ animation: "secreto-blink 1.6s step-end infinite" }}>ACESSO NÃO AUTORIZADO</span>
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
              REGISTRO AVULSO // ██-{String(PERFIS_SECRETOS.length).padStart(2, "0")}
            </div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8, color: NEON_MID, fontSize: 9, letterSpacing: "0.16em" }}>
              <span>{String(PERFIS_SECRETOS.length).padStart(2, "0")} REGISTROS</span>
              <span>ORIGEM: FORA DO ÍNDICE</span>
              <span>NÍVEL ██</span>
            </div>
            <div style={{ height: 1, background: "rgba(0,255,102,0.18)", marginTop: 14 }} />
          </div>

          {/* Perfis — lado a lado; empilham quando não cabem */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))",
              gap: 16,
            }}
          >
            {PERFIS_SECRETOS.map((p, i) => (
              <PerfilCard key={p.id} perfil={p} index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Saída discreta */}
      <button
        onClick={onClose}
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

// ── CARD DE PERFIL ──────────────────────────────────────────────────────────

function PerfilCard({ perfil, index }: { perfil: PerfilSecreto; index: number }) {
  const [src, setSrc] = useState(perfil.foto ?? FOTO_CENSURADA);

  // Todos os campos viram uma fita só; cada um mostra o seu pedaço dela.
  const campos = [perfil.nome, perfil.idade, perfil.dimensao, perfil.bio, perfil.notas, perfil.registros];
  const fita = campos.join("");
  const { n, completar, terminou } = useDigitacao(fita, index * 120);

  let offset = 0;
  const [nome, idade, dimensao, bio, notas, registros] = campos.map((texto) => {
    const inicio = offset;
    offset += texto.length;
    const feito = Math.max(0, Math.min(texto.length, n - inicio));
    return {
      texto: texto.slice(0, feito),
      iniciado: n > inicio,
      // cursor fica no campo que está sendo digitado agora
      ativo: !terminou && n > inicio && n <= inicio + texto.length,
    };
  });

  return (
    <div
      onClick={completar}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 14,
        border: "1px solid rgba(0,255,102,0.22)",
        background: "linear-gradient(180deg, rgba(0,255,102,0.04), rgba(0,255,102,0.01))",
        animation: `secreto-card-in 0.45s ease ${index * 120}ms both`,
        minWidth: 0,
        cursor: terminou ? "default" : "pointer",
      }}
    >
      <div style={{ display: "flex", gap: 14, minWidth: 0 }}>
        <div
          style={{
            width: 110,
            height: 138,
            flexShrink: 0,
            border: "1px solid rgba(0,255,102,0.3)",
            background: "#0a160f",
            overflow: "hidden",
          }}
        >
          <img
            src={src}
            alt={perfil.nome}
            onError={() => setSrc(FOTO_CENSURADA)}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: NEON_DIM, fontSize: 9, letterSpacing: "0.1em" }}>
            #{String(index + 1).padStart(2, "0")}
          </div>
          <Campo label="NOME" valor={nome.texto} ativo={nome.ativo} destaque />
          <Campo label="IDADE" valor={idade.texto} ativo={idade.ativo} />
          <Campo label="DIMENSÃO DE ORIGEM" valor={dimensao.texto} ativo={dimensao.ativo} />
        </div>
      </div>

      {bio.iniciado && <Secao titulo="BIO" texto={bio.texto} ativo={bio.ativo} />}
      {notas.iniciado && <Secao titulo="NOTAS" texto={notas.texto} ativo={notas.ativo} />}
      {registros.iniciado && <Secao titulo="REGISTROS" texto={registros.texto} ativo={registros.ativo} />}
    </div>
  );
}

/** Cursor de bloco piscando, igual ao do texto das Fagulhas. */
function Cursor() {
  return <span style={{ color: NEON, animation: "secreto-caret 1.04s step-end infinite" }}>█</span>;
}

function Campo({
  label,
  valor,
  ativo,
  destaque = false,
}: {
  label: string;
  valor: string;
  ativo: boolean;
  destaque?: boolean;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: NEON_MID, fontSize: 8, letterSpacing: "0.2em", marginBottom: 2 }}>{label}</div>
      <div
        style={{
          color: "#E6FFE9",
          fontFamily: destaque ? "'VT323',monospace" : MONO,
          fontSize: destaque ? 24 : 12,
          lineHeight: 1.1,
          letterSpacing: "0.04em",
          overflowWrap: "anywhere",
          minHeight: "1.1em",
        }}
      >
        {valor}
        {ativo && <Cursor />}
      </div>
    </div>
  );
}

function Secao({ titulo, texto, ativo }: { titulo: string; texto: string; ativo: boolean }) {
  return (
    <div>
      <div style={{ color: NEON_MID, fontSize: 9, letterSpacing: "0.22em", marginBottom: 6 }}>
        &gt; {titulo}
      </div>
      <div
        style={{
          color: "rgba(230,255,233,0.85)",
          fontSize: 12,
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          borderLeft: "1px solid rgba(0,255,102,0.18)",
          paddingLeft: 10,
        }}
      >
        {texto}
        {ativo && <Cursor />}
      </div>
    </div>
  );
}
