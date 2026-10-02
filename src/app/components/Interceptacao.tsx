import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  INTERCEPTACAO_FALAS,
  INTERCEPTACAO_RODAPE,
  REVELA_AUSTIN_EM,
  charParaMorse,
  textoParaMorse,
} from "../interceptacao-data";
import { pausaAudioDoSite, playGlitchOnce } from "../sounds";

// ============================================================================
// INTERCEPTAÇÃO AUSTIN → HUNTER — evento raro, site-wide
// ============================================================================
// Pode cair por cima de qualquer tela (terminal, Grupo, Arquivo Secreto,
// countdown, tela da Sophia). A cada carregamento/navegação o site chama
// sinalizaNavegacao(): se o visitante estiver elegível (menos de
// INTERCEPTACAO_MAX disparos e cooldown vencido), sorteia com
// INTERCEPTACAO_CHANCE. Sorteado, espera um pouco e abre — mas nunca enquanto
// uma tela pede senha (ver useTravaInterceptacao): nesse caso fica pendente e
// abre quando a trava sai.
//
// O disparo só conta (localStorage) no momento em que a tela abre de fato.

/** Diferença real mínima entre um disparo e o próximo. */
export const INTERCEPTACAO_COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48h
/** Máximo de disparos por navegador. */
export const INTERCEPTACAO_MAX = 4;
/** Chance por carregamento/navegação, quando elegível. */
export const INTERCEPTACAO_CHANCE = 0.06;
/** Espera entre o sorteio e a tela abrir (ms) — sorteado no intervalo. */
const ATRASO_MIN_MS = 1500;
const ATRASO_MAX_MS = 4500;

const STORAGE_KEY = "veu_interceptacao_v1";

// Ritmo da transcrição
const ENTRADA_MS = 1100; // cabeçalho sozinho antes da primeira fala
const ENTRE_FALAS_MS = 650;
const TICK_MS = 16;
const SIMBOLOS_POR_TICK = 2; // caracteres-fonte (códigos Morse) por tick
const RODAPE_APOS_MS = 1400; // fim da conversa → começa a decodificar o rodapé
const DECOD_TICK_MS = 38; // cada troca do embaralhamento no rodapé
const DECOD_GIROS = 2; // trocas antes de cada caractere assentar

// Cores
const RED = "#FF3333";
const HUNTER_BLUE = "#3DA5FF";
const AUSTIN_GOLD = "#FFD25A";
const MORSE_COR = "rgba(225,230,235,0.78)";
const MONO = "'Share Tech Mono',monospace";

// ── Registro (localStorage) ─────────────────────────────────────────────────

interface Registro {
  disparos: number;
  ultimoEm: number | null;
}

/** null = localStorage indisponível/corrompido → sem como limitar, não dispara. */
function carregaRegistro(): Registro | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { disparos: 0, ultimoEm: null };
    const r = JSON.parse(raw) as Partial<Registro>;
    if (typeof r.disparos !== "number") return null;
    return { disparos: r.disparos, ultimoEm: typeof r.ultimoEm === "number" ? r.ultimoEm : null };
  } catch {
    return null;
  }
}

function salvaRegistro(r: Registro) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  } catch {
    /* quota / modo privado — ignora */
  }
}

function elegivel(): boolean {
  const r = carregaRegistro();
  if (!r || r.disparos >= INTERCEPTACAO_MAX) return false;
  // Relógio voltado para trás (agora < último) não conta como cooldown vencido.
  return r.ultimoEm === null || Date.now() - r.ultimoEm >= INTERCEPTACAO_COOLDOWN_MS;
}

// ── Estado global (fora do React: qualquer tela sinaliza/trava) ─────────────

let aberta = false;
let pendente = false;
let travas = 0;
let agendado: ReturnType<typeof setTimeout> | null = null;
const ouvintes = new Set<() => void>();

function avisa() {
  ouvintes.forEach((f) => f());
}

function abre() {
  pendente = false;
  aberta = true;
  avisa();
}

function agenda() {
  if (agendado) clearTimeout(agendado);
  const atraso = ATRASO_MIN_MS + Math.random() * (ATRASO_MAX_MS - ATRASO_MIN_MS);
  agendado = setTimeout(() => {
    agendado = null;
    if (!pendente || aberta || travas > 0) return; // a trava, ao sair, reagenda
    // Outra aba pode ter disparado nesse meio-tempo.
    if (!elegivel()) {
      pendente = false;
      return;
    }
    const r = carregaRegistro()!;
    salvaRegistro({ disparos: r.disparos + 1, ultimoEm: Date.now() });
    abre();
  }, atraso);
}

/** Chamar a cada carregamento/navegação entre telas. */
export function sinalizaNavegacao() {
  if (aberta || pendente) return;
  if (!elegivel() || Math.random() >= INTERCEPTACAO_CHANCE) return;
  pendente = true;
  agenda();
}

/** Enquanto `ativa`, a interceptação não abre (tela pedindo senha). */
export function useTravaInterceptacao(ativa: boolean) {
  useEffect(() => {
    if (!ativa) return;
    travas++;
    return () => {
      travas--;
      if (travas === 0 && pendente) agenda();
    };
  }, [ativa]);
}

/** true enquanto a interceptação estiver na tela. */
export function useInterceptacaoAberta(): boolean {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => aberta
  );
}

export function fechaInterceptacao() {
  if (!aberta) return;
  aberta = false;
  avisa();
}

// Atalhos de teste no console — só em `npm run dev` (ver DEBUG-AUDIT.md).
declare global {
  interface Window {
    testeInterceptacao?: { abrir: () => void; zerar: () => void; estado: () => Registro | null };
  }
}
if (import.meta.env.DEV) {
  window.testeInterceptacao = {
    abrir: () => {
      if (!aberta) abre();
    },
    zerar: () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    },
    estado: carregaRegistro,
  };
}

// ── Tela ────────────────────────────────────────────────────────────────────

const CSS = `
@keyframes icp-in{0%{opacity:0;filter:brightness(3) saturate(0)}12%{opacity:1}18%{opacity:.35}26%{opacity:1;filter:brightness(1.6)}100%{opacity:1;filter:none}}
@keyframes icp-fala-in{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
@keyframes icp-caret{0%,100%{opacity:1}50%{opacity:0}}
@keyframes icp-dot{0%,100%{opacity:.15}40%{opacity:1}}
@keyframes icp-pulse{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes icp-g1{0%,100%{clip-path:inset(0 0 70% 0);transform:translate(-2px,0)}20%{clip-path:inset(40% 0 30% 0);transform:translate(3px,0)}40%{clip-path:inset(80% 0 2% 0);transform:translate(-3px,0)}60%{clip-path:inset(10% 0 60% 0);transform:translate(2px,0)}80%{clip-path:inset(55% 0 20% 0);transform:translate(-1px,0)}}
@keyframes icp-g2{0%,100%{clip-path:inset(60% 0 5% 0);transform:translate(2px,0)}25%{clip-path:inset(5% 0 75% 0);transform:translate(-3px,0)}50%{clip-path:inset(35% 0 40% 0);transform:translate(3px,0)}75%{clip-path:inset(85% 0 0 0);transform:translate(-2px,0)}}
@keyframes icp-jitter{0%,88%,100%{transform:none;text-shadow:0 0 10px rgba(255,51,51,.65)}90%{transform:translate(-2px,1px);text-shadow:2px 0 #00E5FF,-2px 0 #FF0040}93%{transform:translate(2px,-1px);text-shadow:-2px 0 #00E5FF,2px 0 #FF0040}96%{transform:translate(-1px,0)}}
@keyframes icp-revela{0%,30%,60%{opacity:.2}15%,45%,100%{opacity:1}}
.icp-glitch{position:relative;display:inline-block}
.icp-glitch::before,.icp-glitch::after{content:attr(data-text);position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}
.icp-glitch::before{color:#00E5FF;opacity:.75;animation:icp-g1 2.2s steps(1) infinite}
.icp-glitch::after{color:#FF0040;opacity:.75;animation:icp-g2 1.7s steps(1) infinite}
.icp-austin{background:linear-gradient(90deg,${HUNTER_BLUE} 0%,${AUSTIN_GOLD} 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
.icp-voltar{color:rgba(255,255,255,.22);transition:color .2s ease}
.icp-voltar:hover,.icp-voltar:focus-visible{color:rgba(255,255,255,.6)}
`;

export function InterceptacaoOverlay({ onClose }: { onClose: () => void }) {
  const falas = useMemo(
    () => INTERCEPTACAO_FALAS.map((f) => ({ ...f, morse: textoParaMorse(f.texto) })),
    []
  );
  // Fala em digitação (-1 = nenhuma ainda) e quantos códigos dela já saíram.
  const [atual, setAtual] = useState(-1);
  const [simbolos, setSimbolos] = useState(0);
  const [silencio, setSilencio] = useState(false);
  // Rodapé: null = ainda em Morse; n = caracteres já decodificados.
  const [decodificados, setDecodificados] = useState<number | null>(null);
  const [, setGiro] = useState(0); // só força o re-render que reembaralha
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // onClose pode chegar recriado a cada render do pai — via ref para o Esc.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Silêncio no site enquanto estiver aberta; retoma ao fechar.
  useEffect(() => {
    const retoma = pausaAudioDoSite();
    void playGlitchOnce();
    return retoma;
  }, []);

  // Esc fecha — em captura, para não fechar também a tela que está por baixo.
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true }); // tira o foco de iframe/campos por baixo
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // Sequência: silêncio → fala digitada código a código → ... → rodapé se
  // decodifica sozinho (as falas nunca).
  useEffect(() => {
    let vivo = true;
    let t: ReturnType<typeof setTimeout> | undefined;
    const espera = (ms: number) => new Promise<void>((r) => (t = setTimeout(r, ms)));

    void (async () => {
      await espera(ENTRADA_MS);
      for (let i = 0; i < falas.length; i++) {
        const { pausaAntesMs, morse } = falas[i];
        if (pausaAntesMs) setSilencio(true);
        await espera(pausaAntesMs ?? ENTRE_FALAS_MS);
        if (!vivo) return;
        setSilencio(false);
        setAtual(i);
        setSimbolos(0);
        for (let n = SIMBOLOS_POR_TICK; n < morse.length + SIMBOLOS_POR_TICK; n += SIMBOLOS_POR_TICK) {
          await espera(TICK_MS);
          if (!vivo) return;
          setSimbolos(n);
        }
      }
      await espera(RODAPE_APOS_MS);
      for (let n = 0; n <= RODAPE.length; n++) {
        if (!vivo) return;
        setDecodificados(n);
        const giros = n < RODAPE.length && RODAPE[n].ch !== " " ? DECOD_GIROS : 1;
        for (let g = 0; g < giros; g++) {
          await espera(DECOD_TICK_MS);
          if (!vivo) return;
          setGiro((x) => x + 1);
        }
      }
    })();

    return () => {
      vivo = false;
      if (t) clearTimeout(t);
    };
  }, [falas]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [atual, simbolos, silencio, decodificados !== null]);

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Interceptação de alta prioridade"
      style={{
        position: "fixed",
        inset: 0,
        // acima de tudo: Grupo/Arquivo/countdown (600) e a tela da Sophia (700)
        zIndex: 900,
        background:
          "radial-gradient(ellipse at center, rgba(60,0,0,0.35) 0%, rgba(0,0,0,0) 70%), #050000",
        fontFamily: MONO,
        cursor: "default",
        outline: "none",
        animation: "icp-in 0.7s ease-out both",
      }}
    >
      <style>{CSS}</style>

      {/* Scanlines */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "repeating-linear-gradient(0deg, rgba(255,40,40,0.05) 0px, rgba(255,40,40,0.05) 1px, transparent 1px, transparent 3px)",
        }}
      />

      <div ref={scrollRef} style={{ position: "absolute", inset: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 16px 80px" }}>
          {/* Cabeçalho */}
          <div
            style={{
              color: RED,
              fontSize: 9,
              letterSpacing: "0.25em",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: RED,
                boxShadow: `0 0 8px ${RED}`,
                animation: "icp-pulse 0.9s step-end infinite",
              }}
            />
            CAPTURA AO VIVO // CANAL PRIVADO
          </div>
          <div
            className="icp-glitch"
            data-text=">> INTERCEPTAÇÃO DE ALTA PRIORIDADE"
            style={{
              color: RED,
              fontFamily: "'VT323',monospace",
              fontSize: "clamp(24px, 5.4vw, 40px)",
              letterSpacing: "0.06em",
              lineHeight: 1.05,
              textShadow: "0 0 12px rgba(255,51,51,0.55)",
            }}
          >
            &gt;&gt; INTERCEPTAÇÃO DE ALTA PRIORIDADE
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 18px",
              marginTop: 10,
              color: "rgba(255,90,90,0.55)",
              fontSize: 9,
              letterSpacing: "0.16em",
            }}
          >
            <span>ORIGEM: ██████</span>
            <span>DESTINO: ██████</span>
            <span>PAYLOAD: MORSE</span>
            <span>PACOTES: {String(falas.length).padStart(2, "0")}</span>
          </div>
          <div style={{ height: 1, background: "rgba(255,51,51,0.3)", margin: "14px 0 22px" }} />

          {/* Transcrição */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {falas.slice(0, atual + 1).map((f, i) => {
              const digitando = i === atual && simbolos < f.morse.length;
              return (
                <div key={i} style={{ animation: "icp-fala-in 0.25s ease-out both" }}>
                  <Rotulo de={f.de} indice={i} />
                  <div
                    style={{
                      color: MORSE_COR,
                      fontSize: 13,
                      lineHeight: 1.7,
                      letterSpacing: "0.12em",
                      wordBreak: "break-word",
                      marginTop: 2,
                    }}
                  >
                    {(i === atual ? f.morse.slice(0, simbolos) : f.morse).join(" ")}
                    {digitando && <Caret />}
                  </div>
                </div>
              );
            })}

            {silencio && (
              <div aria-hidden="true" style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, letterSpacing: "0.3em" }}>
                {[0, 1, 2].map((d) => (
                  <span key={d} style={{ animation: `icp-dot 1.2s ease-in-out ${d * 0.2}s infinite` }}>
                    .
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Rodapé — em Morse durante a conversa; depois se decodifica sozinho */}
          <div
            style={{
              marginTop: 34,
              paddingTop: 16,
              borderTop: "1px solid rgba(255,51,51,0.35)",
            }}
          >
            <Rodape decodificados={decodificados} />
          </div>
        </div>
      </div>

      {/* Saída discreta, igual às outras telas */}
      <button
        className="icp-voltar"
        onClick={onClose}
        style={{
          position: "fixed",
          bottom: 20,
          left: 20,
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.18em",
          background: "transparent",
          border: "none",
          padding: 6,
          cursor: "pointer",
          zIndex: 2,
        }}
      >
        &lt; VOLTAR
      </button>
    </div>
  );
}

// Rodapé, caractere a caractere, com o código Morse de cada um.
const RODAPE = Array.from(INTERCEPTACAO_RODAPE, (ch) => ({ ch, morse: charParaMorse(ch) }));
const GIRO_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Durante o giro: ora um código Morse qualquer, ora um caractere qualquer. */
function giroAleatorio(): string {
  const ch = GIRO_POOL[Math.floor(Math.random() * GIRO_POOL.length)];
  return Math.random() < 0.5 ? charParaMorse(ch) : ch;
}

function Rodape({ decodificados }: { decodificados: number | null }) {
  const n = decodificados ?? 0;
  const pronto = n >= RODAPE.length;
  const resto = RODAPE.slice(decodificados === null ? 0 : n + 1)
    .map((c) => c.morse)
    .filter(Boolean)
    .join(" ");
  const girando = decodificados !== null && !pronto && RODAPE[n].ch !== " ";

  return (
    <div
      aria-label={pronto ? INTERCEPTACAO_RODAPE : undefined}
      style={{
        color: RED,
        fontSize: pronto ? "clamp(13px, 2.6vw, 17px)" : 13,
        letterSpacing: "0.12em",
        lineHeight: 1.7,
        fontWeight: 700,
        wordBreak: "break-word",
        textShadow: "0 0 10px rgba(255,51,51,0.45)",
        animation: pronto ? "icp-jitter 3.2s linear infinite" : undefined,
      }}
    >
      {decodificados !== null && (
        <span>
          {RODAPE.slice(0, n)
            .map((c) => c.ch)
            .join("")}
        </span>
      )}
      {girando && <span style={{ color: "#FFE0E0" }}>{giroAleatorio()}</span>}
      {!pronto && <span style={{ opacity: 0.6, fontWeight: 400 }}> {resto}</span>}
    </div>
  );
}

function Rotulo({ de, indice }: { de: "austin" | "hunter"; indice: number }) {
  const base = { fontSize: 12, letterSpacing: "0.1em", fontWeight: 700 } as const;
  if (de === "hunter") return <span style={{ ...base, color: HUNTER_BLUE }}>Hunter:</span>;
  if (indice < REVELA_AUSTIN_EM)
    return <span style={{ ...base, color: "rgba(255,255,255,0.5)" }}>[████████]:</span>;
  return (
    <span
      className="icp-austin"
      style={{ ...base, display: "inline-block", animation: "icp-revela 0.6s steps(1) both" }}
    >
      Austin:
    </span>
  );
}

function Caret() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 7,
        height: 13,
        marginLeft: 3,
        verticalAlign: "-2px",
        background: MORSE_COR,
        animation: "icp-caret 0.8s step-end infinite",
      }}
    />
  );
}
