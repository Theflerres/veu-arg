import { useEffect, useRef, useSyncExternalStore } from "react";
import { AbelhaPixel } from "./AbelhaPixel";
import { estadoInterceptacao, useTravaInterceptacao } from "./Interceptacao";
import {
  BEE_ATRASO_MAX_MS,
  BEE_ATRASO_MIN_MS,
  BEE_CHANCE,
  BEE_COOLDOWN_MS,
  BEE_MAX,
  BEE_VOO_MS,
  BOTT_ABERTURA,
} from "../bott-data";
import { CHAVES, HUB_URL } from "../bott-progresso";
import { registraTesteBott } from "../bott-teste";
import { liberaEvento, outroEvento, reservaEvento } from "../eventos-raros";
import { agora, sincronizaHora } from "../hora-confiavel";
import { playBottAbelha, stopBottAbelha } from "../sounds";

// ============================================================================
// ABELHA RARA — atravessa o terminal e, clicada, leva ao hub da Bott
// ============================================================================
// Mesmo padrão da Interceptação: a cada carregamento/troca de tela o terminal
// chama sinalizaAbelha(). Elegível (a partir de BOTT_ABERTURA pela hora
// confiável, menos de BEE_MAX aparições, cooldown vencido), sorteia com
// BEE_CHANCE; sorteada, espera um pouco e voa. Nunca junto da Interceptação
// (nem sorteada, nem aberta), do chat do terminal (eventos-raros.ts) e nunca
// com uma tela pedindo senha — nesses casos a vez simplesmente passa.
// Enquanto voa, trava a Interceptação.
//
// A aparição só conta (localStorage) no momento em que a abelha entra.

const COR = "#F4FFE8";
const RASTRO_CORES = ["#FFB000", "#00FF66"];
const RASTRO_A_CADA_MS = 85;

// ── Registro (localStorage) ─────────────────────────────────────────────────

interface Registro {
  vezes: number;
  ultimaEm: number | null;
}

/** null = localStorage indisponível/corrompido → sem como limitar, não voa. */
function carrega(): Registro | null {
  try {
    const raw = localStorage.getItem(CHAVES.abelha);
    if (!raw) return { vezes: 0, ultimaEm: null };
    const r = JSON.parse(raw) as Partial<Registro>;
    if (typeof r.vezes !== "number") return null;
    return { vezes: r.vezes, ultimaEm: typeof r.ultimaEm === "number" ? r.ultimaEm : null };
  } catch {
    return null;
  }
}

function salva(r: Registro) {
  try {
    localStorage.setItem(CHAVES.abelha, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

function elegivel(): boolean {
  const t = agora();
  if (t < BOTT_ABERTURA) return false;
  const r = carrega();
  if (!r || r.vezes >= BEE_MAX) return false;
  return r.ultimaEm === null || t - r.ultimaEm >= BEE_COOLDOWN_MS;
}

const EVENTO = "abelha";

function bloqueada(): boolean {
  const i = estadoInterceptacao();
  return i.ocupada || i.travada || outroEvento(EVENTO);
}

// ── Estado global (fora do React) ───────────────────────────────────────────

let voando = false;
let sorteando = false;
const ouvintes = new Set<() => void>();

function avisa() {
  ouvintes.forEach((f) => f());
}

function voa() {
  voando = true;
  avisa();
}

function pousa() {
  if (!voando) return;
  voando = false;
  liberaEvento(EVENTO);
  avisa();
}

/** Chamar a cada carregamento/troca de tela do terminal. */
export function sinalizaAbelha() {
  if (voando || sorteando) return;
  sorteando = true;
  void sincronizaHora().then(() => {
    if (!elegivel() || bloqueada() || Math.random() >= BEE_CHANCE || !reservaEvento(EVENTO)) {
      sorteando = false;
      return;
    }
    const atraso = BEE_ATRASO_MIN_MS + Math.random() * (BEE_ATRASO_MAX_MS - BEE_ATRASO_MIN_MS);
    setTimeout(() => {
      sorteando = false;
      // Outra aba pode ter contado nesse meio-tempo; a Interceptação pode ter sido sorteada.
      if (voando || !elegivel() || bloqueada()) {
        if (!voando) liberaEvento(EVENTO);
        return;
      }
      const r = carrega()!;
      salva({ vezes: r.vezes + 1, ultimaEm: agora() });
      voa();
    }, atraso);
  });
}

function useAbelhaVoando(): boolean {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => voando
  );
}

if (import.meta.env.DEV) {
  registraTesteBott({
    abelha: () => {
      if (voando) return;
      reservaEvento(EVENTO);
      voa();
    },
  });
}

// ── Tela ────────────────────────────────────────────────────────────────────

const CSS = `
@keyframes abr-hex{0%{opacity:.9;transform:translate(-50%,-50%) scale(1) rotate(0deg)}60%{opacity:.35}100%{opacity:0;transform:translate(-50%,-50%) scale(.2) rotate(90deg)}}
.abr-hex{position:absolute;pointer-events:none;clip-path:polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%);animation:abr-hex 1.1s ease-out forwards}
@keyframes abr-pega{0%{filter:brightness(1)}50%{filter:brightness(3)}100%{filter:brightness(1) blur(2px);opacity:0}}
`;

/** Monta no terminal; só desenha algo enquanto a abelha estiver voando. */
export function AbelhaRara() {
  const ativa = useAbelhaVoando();
  // Interceptação espera a abelha passar.
  useTravaInterceptacao(ativa);
  return ativa ? <Voo onFim={pousa} /> : null;
}

function Voo({ onFim }: { onFim: () => void }) {
  const raizRef = useRef<HTMLDivElement>(null);
  const abelhaRef = useRef<HTMLButtonElement>(null);
  const pegaRef = useRef(false);
  const onFimRef = useRef(onFim);
  onFimRef.current = onFim;

  useEffect(() => {
    playBottAbelha();
    const raiz = raizRef.current!;
    const abelha = abelhaRef.current!;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const y0 = H * (0.22 + Math.random() * 0.5);
    const amp = 28 + Math.random() * 46;
    const voltas = 1.6 + Math.random() * 1.2;
    const fase = Math.random() * Math.PI * 2;
    const margem = 90;

    const pos = (p: number) => {
      const x = dir > 0 ? -margem + (W + 2 * margem) * p : W + margem - (W + 2 * margem) * p;
      const y =
        y0 + amp * Math.sin(2 * Math.PI * voltas * p + fase) + 10 * Math.sin(2 * Math.PI * 6.3 * p);
      return { x, y };
    };

    let raf = 0;
    let ultimoRastro = 0;
    const t0 = performance.now();

    const quadro = (t: number) => {
      if (pegaRef.current) return;
      const p = (t - t0) / BEE_VOO_MS;
      if (p >= 1) {
        onFimRef.current();
        return;
      }
      const { x, y } = pos(p);
      const prox = pos(Math.min(1, p + 0.004));
      const inclina = Math.max(-28, Math.min(28, (Math.atan2(prox.y - y, Math.abs(prox.x - x)) * 180) / Math.PI));
      abelha.style.transform = `translate(${x - 36}px,${y - 36}px) rotate(${dir * inclina}deg) scaleX(${dir})`;

      if (t - ultimoRastro > RASTRO_A_CADA_MS) {
        ultimoRastro = t;
        const hex = document.createElement("div");
        const tam = 6 + Math.random() * 9;
        hex.className = "abr-hex";
        hex.style.cssText = `left:${x - dir * 20}px;top:${y + (Math.random() - 0.5) * 10}px;width:${tam}px;height:${tam * 0.9}px;background:${RASTRO_CORES[Math.random() < 0.65 ? 0 : 1]}`;
        hex.addEventListener("animationend", () => hex.remove(), { once: true });
        raiz.appendChild(hex);
      }
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);

    return () => {
      cancelAnimationFrame(raf);
      stopBottAbelha();
    };
  }, []);

  const pega = () => {
    if (pegaRef.current) return;
    pegaRef.current = true;
    const abelha = abelhaRef.current;
    if (abelha) abelha.style.animation = "abr-pega 0.35s ease-out forwards";
    setTimeout(() => window.location.assign(HUB_URL), 300);
  };

  return (
    <div
      ref={raizRef}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 800 }}
    >
      <style>{CSS}</style>
      <button
        ref={abelhaRef}
        type="button"
        tabIndex={-1}
        onClick={pega}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 72,
          height: 72,
          padding: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          pointerEvents: "auto",
          color: COR,
          transform: "translate(-200px,-200px)",
          filter: "drop-shadow(0 0 3px rgba(255,176,0,0.75)) drop-shadow(0 0 10px rgba(0,255,102,0.35))",
          willChange: "transform",
        }}
      >
        <AbelhaPixel largura={48} asaMs={60} />
      </button>
    </div>
  );
}
