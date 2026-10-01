import { useEffect, useState } from "react";

// ============================================================================
// COUNTDOWN DA LIVE (P3_KERNEL) — easter egg + overlay em tela cheia
// ============================================================================
// O countdown em si é uma página à parte, `timer/index.html` (segunda entrada
// do Vite, ver vite.config.ts), com os assets em `public/timer/assets/`. Ele
// roda dentro de um <iframe> em vez de virar componente React de propósito:
// são ~2.500 linhas de JS de DOM puro, com ids globais, classes no <body> e
// dezenas de timers de módulo. No iframe tudo isso fica isolado do site, e
// fechar o overlay destrói todos os timers de uma vez. A mesma página segue
// acessível direto em `<base>/timer/`; os parâmetros de teste dela só existem
// em `npm run dev` (ver DEBUG-AUDIT.md).

const TIMER_SRC = `${import.meta.env.BASE_URL}timer/index.html`;
const NEON = "#00FF66";

/** Relógio discreto no canto: quase invisível até o cursor chegar perto. */
export function TimerEasterEgg({ onOpen, bottom }: { onOpen: () => void; bottom: number }) {
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onFocus={() => setHov(true)}
      onBlur={() => setHov(false)}
      aria-label="Abrir countdown"
      style={{
        position: "fixed",
        right: 10,
        bottom: bottom + 8,
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
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5" />
        <path d="M9.5 2.5h5" />
        <path d="M12 2.5V5" />
      </svg>
    </button>
  );
}

export function TimerOverlay({ onClose }: { onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);

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
        // mesmo patamar da tela de Grupo: acima dos overlays de CRT do site (o
        // countdown já tem o próprio CRT)
        zIndex: 600,
      }}
    >
      <iframe
        src={TIMER_SRC}
        title="P3_KERNEL // COUNTDOWN_MODULE"
        allow="autoplay; fullscreen"
        onLoad={() => setLoaded(true)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
          background: "#050605",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      />

      {/* Saída discreta — abaixo do rodapé do countdown para não cobrir o status */}
      <button
        onClick={onClose}
        style={{
          position: "fixed",
          bottom: 4,
          left: 10,
          fontFamily: "'Share Tech Mono',monospace",
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.22)",
          background: "transparent",
          border: "none",
          padding: 4,
          cursor: "pointer",
          transition: "color 0.2s ease",
          zIndex: 1,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.22)"; }}
      >
        &lt; VOLTAR
      </button>
    </div>
  );
}
