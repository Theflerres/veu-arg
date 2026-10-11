import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  CENA99_GLITCH_MS,
  CHECKLIST,
  CONTROLE_ROTULO,
  DIAGNOSTICO,
  FALAS,
  FALAS_CORTADAS,
  FALA_CORTADA_MARCA,
  PROGRESSO_B,
  RITMO,
  TEMPO_LIGADA,
  VERMELHO_DIGITA_MS,
  VERMELHO_OCIOSO_MS,
  VERMELHO_VISIVEL_MS,
  frasesP3,
  type StatusTarefa,
} from "../app/bott-data";
import {
  avancaProgressoB,
  cena99Disponivel,
  cena99Vista,
  forcaUltimoProgressoB,
  leProgressoB,
  registraCena99,
} from "../app/bott-progresso";
import { registraTesteBott } from "../app/bott-teste";
import { playBottVermelho, tocaFxGlitch } from "../app/sounds";
import { AMBAR, DISPLAY, HEX_CLIP, LABEL, VERDE, VERDE_APAGADO, VERDE_DIM, VERDE_MID, VERMELHO } from "./estilo";

// Painéis do hub. Cada um cuida da própria animação; o que depende de evento
// (pensamento, log, instabilidade do CONTROLE) chega por props do BottHub.

const sorteia = (min: number, max: number) => min + Math.random() * (max - min);
const BLOCOS = "█▓▒░▚▞▙▟";
const FUNDO_TEXTO = "#021006";

/** Texto digitado letra a letra. Recomeça quando `texto` ou `chave` mudam. */
export function useDigitado(texto: string, ms: number, chave?: unknown): string {
  // O contador é amarrado ao texto: no primeiro render de um texto novo ele
  // já vale 0 (sem um quadro com o texto novo "pronto" pelo contador antigo).
  const id = `${String(chave)}\u0000${texto}`;
  const [estado, setEstado] = useState({ id, n: 0 });
  useEffect(() => {
    setEstado({ id, n: 0 });
    if (!texto) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setEstado({ id, n: i });
      if (i >= texto.length) clearInterval(iv);
    }, ms);
    return () => clearInterval(iv);
  }, [id, texto, ms]);
  return texto.slice(0, estado.id === id ? estado.n : 0);
}

/** Força um re-render a cada `ms` enquanto `ativo`. */
function useTique(ms: number, ativo = true) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!ativo) return;
    const iv = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(iv);
  }, [ms, ativo]);
}

function Cursor({ cor = VERDE }: { cor?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: "0.55em",
        height: "1em",
        marginLeft: 3,
        verticalAlign: "-0.12em",
        background: cor,
        animation: "bh-pisca 1s step-end infinite",
      }}
    />
  );
}

// ── Moldura ─────────────────────────────────────────────────────────────────

export function Painel({
  titulo,
  className = "",
  escorrega = false,
  falhando = false,
  atraso = 0,
  children,
}: {
  titulo: string;
  className?: string;
  escorrega?: boolean;
  falhando?: boolean;
  atraso?: number;
  children: ReactNode;
}) {
  return (
    <section
      className={`bh-painel ${className} ${escorrega ? "bh-escorrega" : ""} ${falhando ? "bh-falhando" : ""}`}
      style={{ animationDelay: falhando ? undefined : `${atraso}ms` }}
    >
      <div className="bh-titulo">
        <span className="bh-hex" style={escorrega ? { background: AMBAR, boxShadow: `0 0 6px ${AMBAR}` } : undefined} />
        {titulo}
      </div>
      {children}
    </section>
  );
}

// ── CONTROLE: P3 - 100% ─────────────────────────────────────────────────────

export function Controle({ instavel, faixaMs }: { instavel: boolean; faixaMs: [number, number] }) {
  const [piscando, setPiscando] = useState<string | null>(null);

  // De vez em quando cai para 99.x% por um instante e volta.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const agenda = () => {
      t = setTimeout(() => {
        setPiscando(`99.${1 + Math.floor(Math.random() * 9)}`);
        t = setTimeout(() => {
          setPiscando(null);
          agenda();
        }, sorteia(140, 480));
      }, sorteia(faixaMs[0], faixaMs[1]));
    };
    agenda();
    return () => clearTimeout(t);
  }, [faixaMs]);

  // Durante um deslize, fica oscilando abaixo de 100.
  useTique(260, instavel);
  const valor = instavel ? `99.${1 + Math.floor(Math.random() * 9)}` : piscando ?? "100";
  const caiu = valor !== "100";

  return (
    <span style={{ whiteSpace: "nowrap", fontSize: 11 }}>
      <span style={{ color: VERDE_MID }}>{CONTROLE_ROTULO} - </span>
      <span
        className={caiu ? "bh-ambar" : "bh-verde"}
        style={{ display: "inline-block", minWidth: "4.6ch", textAlign: "right" }}
      >
        {valor}%
      </span>
    </span>
  );
}

// ── TEMPO LIGADA ────────────────────────────────────────────────────────────
// Ao montar: número gigante bugado (dígitos e unidade trocando sem parar),
// depois os dígitos caem um a um da direita até sobrar o valor final.

const UNIDADES = ["SEG", "MIN", "HORAS", "DIAS", "ANOS", "????", "ERR"];
const BUG_MS = 2700;
const ASSENTA_TIQUE_MS = 90;

export function TempoLigada() {
  const [fase, setFase] = useState<"bug" | "assenta" | "ok">("bug");
  const [resto, setResto] = useState(12);
  const [soluco, setSoluco] = useState<string | null>(null);
  useTique(55, fase !== "ok");

  useEffect(() => {
    const t = setTimeout(() => setFase("assenta"), BUG_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (fase !== "assenta") return;
    const iv = setInterval(() => {
      setResto((r) => {
        if (r <= 1) {
          clearInterval(iv);
          setFase("ok");
          return 1;
        }
        return r - 1;
      });
    }, ASSENTA_TIQUE_MS);
    return () => clearInterval(iv);
  }, [fase]);

  // Já assentado: um soluço raro, um dígito errado por um quadro.
  useEffect(() => {
    if (fase !== "ok") return;
    let t: ReturnType<typeof setTimeout>;
    const agenda = () => {
      t = setTimeout(() => {
        setSoluco(String(Math.floor(Math.random() * 10)));
        t = setTimeout(() => {
          setSoluco(null);
          agenda();
        }, 90);
      }, sorteia(25_000, 60_000));
    };
    agenda();
    return () => clearTimeout(t);
  }, [fase]);

  const digitos = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
  let numero: string;
  let unidade: string;
  if (fase === "bug") {
    numero = digitos(5 + Math.floor(Math.random() * 8));
    unidade = UNIDADES[Math.floor(Math.random() * UNIDADES.length)];
  } else if (fase === "assenta") {
    numero = resto > 1 ? TEMPO_LIGADA.numero + digitos(resto - 1) : TEMPO_LIGADA.numero;
    unidade = TEMPO_LIGADA.unidade;
  } else {
    numero = soluco ?? TEMPO_LIGADA.numero;
    unidade = TEMPO_LIGADA.unidade;
  }
  const bugado = fase !== "ok";

  return (
    <div
      className="bh-tempo"
      aria-label={`${TEMPO_LIGADA.numero} ${TEMPO_LIGADA.unidade}`}
      style={{
        display: "flex",
        alignItems: "center",
        height: "clamp(110px, 17vw, 180px)",
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, minWidth: 0 }}>
      <span
        className={`bh-tempo-num ${bugado && Math.random() < 0.18 ? "bh-ambar" : "bh-verde"}`}
        style={{
          fontFamily: DISPLAY,
          fontSize: bugado ? "clamp(56px, 9vw, 118px)" : "clamp(96px, 15vw, 172px)",
          lineHeight: 0.95,
          letterSpacing: "0.04em",
          transform: bugado && Math.random() < 0.25 ? `translateX(${Math.round(sorteia(-6, 6))}px)` : undefined,
          transition: "font-size .25s ease",
        }}
      >
        {numero}
      </span>
      <span className="bh-tempo-uni bh-verde" style={{ fontFamily: DISPLAY, fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "0.12em" }}>
        {unidade}
      </span>
      </div>
    </div>
  );
}

// ── ÚLTIMA FALA ─────────────────────────────────────────────────────────────

export function UltimaFala({
  chanceCorte,
  onCorte,
  onEscorrega,
}: {
  chanceCorte: number;
  onCorte: () => void;
  onEscorrega: (sim: boolean) => void;
}) {
  const [atual, setAtual] = useState<{ texto: string; cortada: boolean; n: number }>(() => ({
    texto: FALAS[Math.floor(Math.random() * FALAS.length)],
    cortada: false,
    n: 0,
  }));
  const cbRef = useRef({ onCorte, onEscorrega });
  cbRef.current = { onCorte, onEscorrega };
  const digitado = useDigitado(atual.texto, RITMO.digitaMs, atual.n);
  const pronto = digitado.length === atual.texto.length;

  // Fala cortada: quando termina de digitar, entra o travessão e a marca.
  useEffect(() => {
    if (!atual.cortada || !pronto) return;
    cbRef.current.onCorte();
    cbRef.current.onEscorrega(true);
    const t = setTimeout(() => cbRef.current.onEscorrega(false), 2200);
    return () => clearTimeout(t);
  }, [atual, pronto]);

  // Rotação: a próxima entra RITMO.falaMs depois desta terminar de digitar.
  useEffect(() => {
    if (!pronto) return;
    const t = setTimeout(() => {
      setAtual((a) => {
        const cortada = Math.random() < chanceCorte;
        const lista = cortada ? FALAS_CORTADAS : FALAS.filter((f) => f !== a.texto);
        return { texto: lista[Math.floor(Math.random() * lista.length)], cortada, n: a.n + 1 };
      });
    }, RITMO.falaMs);
    return () => clearTimeout(t);
  }, [pronto, chanceCorte]);

  return (
    <div style={{ fontSize: 14, lineHeight: 1.65, minHeight: "3.3em" }}>
      <span style={{ color: VERDE_APAGADO, fontFamily: LABEL, fontSize: 11, letterSpacing: "0.14em" }}>BOTT &gt; </span>
      <span className="bh-verde">{digitado}</span>
      {atual.cortada && pronto ? (
        <>
          <span className="bh-ambar">—</span>
          <div
            style={{
              marginTop: 6,
              fontFamily: LABEL,
              fontSize: 10,
              letterSpacing: "0.2em",
              color: VERMELHO,
              textShadow: "0 0 8px rgba(255,59,59,.5)",
              animation: "bh-pisca .5s step-end 4",
            }}
          >
            {FALA_CORTADA_MARCA}
          </div>
        </>
      ) : (
        !pronto && <Cursor />
      )}
    </div>
  );
}

// ── PENSAMENTO ATUAL (controlado pelo BottHub) ──────────────────────────────

export interface EstadoPensamento {
  texto: string;
  tom: "verde" | "ambar";
  sobrescrevendo: boolean;
  n: number;
}

export function Pensamento({ p }: { p: EstadoPensamento }) {
  const digitado = useDigitado(p.texto, RITMO.digitaMs, p.n);
  useTique(50, p.sobrescrevendo);

  // Sobrescrita: o texto vai virando bloco e sumindo do fim para o começo.
  const inicio = useRef(0);
  useEffect(() => {
    if (p.sobrescrevendo) inicio.current = performance.now();
  }, [p.sobrescrevendo]);
  let mostrado = digitado;
  if (p.sobrescrevendo) {
    const q = Math.min(1, (performance.now() - inicio.current) / RITMO.sobrescritaMs);
    const vivos = Math.max(0, Math.round(p.texto.length * (1 - q)));
    mostrado = Array.from(p.texto.slice(0, vivos), (c) =>
      c !== " " && Math.random() < 0.25 + q * 0.7 ? BLOCOS[Math.floor(Math.random() * BLOCOS.length)] : c
    ).join("");
  }
  const ambar = p.tom === "ambar";

  return (
    <div style={{ fontSize: 14, lineHeight: 1.65, minHeight: "3.3em", whiteSpace: "pre-wrap" }}>
      <span style={{ color: VERDE_APAGADO, fontFamily: LABEL, fontSize: 11, letterSpacing: "0.14em" }}>&gt;&gt; </span>
      <span
        className={`${ambar ? "bh-ambar" : "bh-verde"} ${p.sobrescrevendo ? "bh-sobrescreve" : ""}`}
        style={{ display: "inline", fontStyle: ambar ? "italic" : undefined }}
      >
        {mostrado}
      </span>
      {!p.sobrescrevendo && <Cursor cor={ambar ? AMBAR : VERDE} />}
    </div>
  );
}

// ── CHECKLIST ───────────────────────────────────────────────────────────────

const COR_STATUS: Record<StatusTarefa, string> = {
  CONCLUÍDO: VERDE,
  "EM ANDAMENTO": VERDE_MID,
  PENDENTE: "rgba(0,255,102,.55)",
  REASSINALADO: "rgba(230,240,235,.75)",
};

export function Checklist() {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {CHECKLIST.map((t) => {
        const feito = t.status === "CONCLUÍDO";
        return (
          <li
            key={t.tarefa}
            style={{
              position: "relative",
              padding: t.proxima ? "8px 10px" : "4px 10px",
              border: t.proxima ? `1px solid ${VERDE}` : "1px solid transparent",
              background: t.proxima ? "rgba(0,255,102,.06)" : undefined,
              boxShadow: t.proxima ? "0 0 14px rgba(0,255,102,.15)" : undefined,
            }}
          >
            {t.proxima && (
              <div
                style={{
                  fontFamily: LABEL,
                  fontSize: 9,
                  letterSpacing: "0.24em",
                  color: FUNDO_TEXTO,
                  background: VERDE,
                  display: "inline-block",
                  padding: "1px 6px",
                  marginBottom: 6,
                }}
              >
                ▶ PRÓXIMA TAREFA
              </div>
            )}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: LABEL, color: feito ? VERDE : VERDE_APAGADO, fontSize: 12 }}>
                [{feito ? "■" : " "}]
              </span>
              <span
                className="bh-verde"
                style={{ flex: "1 1 180px", fontSize: 13, opacity: feito ? 0.6 : 1, textDecoration: feito ? "line-through" : undefined }}
              >
                {t.tarefa}
              </span>
              <span style={{ fontFamily: LABEL, fontSize: 10, letterSpacing: "0.16em", color: COR_STATUS[t.status] }}>
                {t.status}
              </span>
            </div>
            {t.nota && (
              <div style={{ marginLeft: 34, marginTop: 3, fontFamily: LABEL, fontSize: 10, letterSpacing: "0.08em", color: VERDE_APAGADO }}>
                ↳ {t.nota}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── DIAGNÓSTICO ─────────────────────────────────────────────────────────────

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", padding: "5px 0", borderBottom: "1px dashed rgba(0,255,102,.12)" }}>
      <span style={{ fontFamily: LABEL, fontSize: 10, letterSpacing: "0.18em", color: VERDE_MID, minWidth: 150 }}>{rotulo}</span>
      <span style={{ flex: 1, fontSize: 13 }}>{children}</span>
    </div>
  );
}

export function Diagnostico({
  desligamentos,
  onCena99,
}: {
  desligamentos: number;
  /** Avisa começo (true) e fim (false) da cena do 99%. */
  onCena99?: (ativa: boolean) => void;
}) {
  const d = DIAGNOSTICO;
  const nota = { fontFamily: LABEL, fontSize: 10, color: VERDE_APAGADO, letterSpacing: "0.06em" } as const;
  return (
    <div>
      <Linha rotulo="BACKUPS">
        <span className="bh-verde">{String(d.backups).padStart(2, "0")}</span>{" "}
        <span style={nota}>último: {d.ultimoBackup}</span>{" "}
        <span
          style={{
            display: "inline-block",
            marginLeft: 4,
            padding: "0 5px",
            fontFamily: LABEL,
            fontSize: 9,
            letterSpacing: "0.2em",
            color: VERDE,
            border: `1px solid ${VERDE}`,
            transform: "rotate(-3deg)",
            opacity: 0.85,
          }}
        >
          ✓ {d.marcaBackup}
        </span>
      </Linha>
      <Linha rotulo="ERROS CRÍTICOS">
        <span className="bh-verde">{String(d.errosCriticos).padStart(2, "0")}</span> <span style={nota}>({d.errosNota})</span>
      </Linha>
      <Linha rotulo="DESLIGAMENTOS EM FALA/PENSAMENTO">
        <span className="bh-verde">{String(desligamentos).padStart(2, "0")}</span>
      </Linha>
      <BarraProgressoB onCena={onCena99} />
    </div>
  );
}

// ── BARRA DE PROGRESSO (rótulo censurado) ───────────────────────────────────
// Só para em números repetidos. Sobe um degrau (ou, às vezes, recua um; em 99% nunca)
// quando o visitante fica parado (PROGRESSO_B.ociosoMs sem mouse/teclado/
// toque) ou volta de outra aba, sem passar do teto do dia (bott-progresso.ts).
// A barra fica sempre um degrau à frente do número. Nunca passa do último.
//
// Cena do 99% (cena-99): ver bott-data.ts. Linha do tempo (ms):
//   0–500     a barra treme tentando passar; o número mostra "1██%"
//   600       glitch forte no painel + tremor na tela (CENA99_GLITCH_MS)
//   900       frase em vermelho, digitada rápido, por VERMELHO_VISIVEL_MS
//   depois    some com glitch

const ROTULO_B = "████ ██████████";

const CELULAS = 20;
const ULTIMO = PROGRESSO_B.degraus.length - 1;
const CENA_TENTA_MS = 500;
const CENA_GLITCH_EM = 600;
const CENA_FRASE_EM = 900;
const CENA_SOME_MS = 350;

interface Cena {
  frase: string;
  saindo: boolean;
  n: number;
}

export function BarraProgressoB({ onCena }: { onCena?: (ativa: boolean) => void }) {
  const onCenaRef = useRef(onCena);
  onCenaRef.current = onCena;
  const [idx, setIdx] = useState(leProgressoB);
  const [rolando, setRolando] = useState(false);
  const [tentando, setTentando] = useState(false);
  const [cena, setCena] = useState<Cena | null>(null);
  const raizRef = useRef<HTMLDivElement>(null);
  const cenaAtiva = useRef(false);
  const timersCena = useRef<ReturnType<typeof setTimeout>[]>([]);
  useTique(60, rolando || tentando);
  const fraseDigitada = useDigitado(cena?.frase ?? "", VERMELHO_DIGITA_MS, cena?.n);

  const disparaCena = useCallback(() => {
    if (cenaAtiva.current) return;
    cenaAtiva.current = true;
    onCenaRef.current?.(true);
    registraCena99();
    const frases = frasesP3();
    const frase = frases[Math.floor(Math.random() * frases.length)];
    const painel = raizRef.current?.closest(".bh-painel");
    const tela = document.querySelector(".bh-raiz");
    const em = (ms: number, f: () => void) => timersCena.current.push(setTimeout(f, ms));
    const saiEm = CENA_FRASE_EM + frase.length * VERMELHO_DIGITA_MS + VERMELHO_VISIVEL_MS;

    setTentando(true);
    em(CENA_TENTA_MS, () => setTentando(false));
    em(CENA_GLITCH_EM, () => {
      void tocaFxGlitch();
      painel?.classList.add("bh-glitch-forte");
      tela?.classList.add("bh-tremor");
    });
    em(CENA_GLITCH_EM + CENA99_GLITCH_MS, () => {
      painel?.classList.remove("bh-glitch-forte");
      tela?.classList.remove("bh-tremor");
    });
    em(CENA_FRASE_EM, () => {
      playBottVermelho();
      setCena({ frase, saindo: false, n: Date.now() });
    });
    em(saiEm, () => setCena((c) => (c ? { ...c, saindo: true } : c)));
    em(saiEm + CENA_SOME_MS, () => {
      setCena(null);
      cenaAtiva.current = false;
      onCenaRef.current?.(false);
    });
  }, []);

  // Desmontou no meio da cena: limpa tudo que ela mexeu fora do componente.
  useEffect(() => {
    const raiz = raizRef.current;
    return () => {
      timersCena.current.forEach(clearTimeout);
      if (cenaAtiva.current) onCenaRef.current?.(false);
      raiz?.closest(".bh-painel")?.classList.remove("bh-glitch-forte");
      document.querySelector(".bh-raiz")?.classList.remove("bh-tremor");
    };
  }, []);

  // 1ª vez no 99%: a cena vem na hora (ao chegar ou ao abrir o hub já nele).
  useEffect(() => {
    if (idx !== ULTIMO || cena99Vista() || !cena99Disponivel()) return;
    const t = setTimeout(disparaCena, 1200);
    return () => clearTimeout(t);
  }, [idx, disparaCena]);

  useEffect(() => {
    let ocioso: ReturnType<typeof setTimeout>;
    let armado = true; // um passo por período parado
    let fimRolagem: ReturnType<typeof setTimeout>;
    let ultimoMovimento = performance.now();
    const passo = () => {
      const antes = leProgressoB();
      const depois = avancaProgressoB();
      if (depois === antes) return;
      setRolando(true);
      clearTimeout(fimRolagem);
      fimRolagem = setTimeout(() => {
        setIdx(depois);
        setRolando(false);
      }, 700);
    };
    const arma = () => {
      clearTimeout(ocioso);
      ocioso = setTimeout(() => {
        if (armado && document.visibilityState === "visible") {
          armado = false;
          passo();
        }
      }, PROGRESSO_B.ociosoMs);
    };
    const mexeu = () => {
      armado = true;
      ultimoMovimento = performance.now();
      arma();
    };
    const visibilidade = () => {
      if (document.visibilityState === "visible") {
        passo();
        mexeu();
      }
    };
    // Cena de novo, já no 99%: depois de VERMELHO_OCIOSO_MS parado.
    const vigia = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        performance.now() - ultimoMovimento >= VERMELHO_OCIOSO_MS &&
        leProgressoB() === ULTIMO &&
        cena99Vista() &&
        cena99Disponivel()
      ) {
        disparaCena();
      }
    }, 1000);
    const eventos = ["mousemove", "mousedown", "keydown", "touchstart", "wheel"] as const;
    eventos.forEach((e) => window.addEventListener(e, mexeu, { passive: true }));
    document.addEventListener("visibilitychange", visibilidade);
    arma();
    return () => {
      clearTimeout(ocioso);
      clearTimeout(fimRolagem);
      clearInterval(vigia);
      eventos.forEach((e) => window.removeEventListener(e, mexeu));
      document.removeEventListener("visibilitychange", visibilidade);
    };
  }, [disparaCena]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    registraTesteBott({
      noventaENove: () => {
        forcaUltimoProgressoB();
        setIdx(ULTIMO);
        disparaCena();
      },
    });
  }, [disparaCena]);

  const valor = PROGRESSO_B.degraus[idx];
  const barra = PROGRESSO_B.degraus[Math.min(idx + 1, ULTIMO)];
  const cheias = tentando ? CELULAS : Math.round((barra / 100) * CELULAS);
  const texto = tentando ? "1██" : rolando ? String(10 + Math.floor(Math.random() * 90)) : String(valor);

  return (
    <div ref={raizRef} style={{ paddingTop: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: LABEL, fontSize: 10, letterSpacing: "0.18em", color: VERDE_MID }}>{ROTULO_B}:</span>
        <span
          className={tentando ? "bh-verde bh-barra-tenta" : "bh-verde"}
          style={{ fontFamily: DISPLAY, fontSize: 26, lineHeight: 1, display: "inline-block" }}
        >
          {texto}%
        </span>
      </div>
      <div className={tentando ? "bh-barra-tenta" : undefined} style={{ display: "flex", gap: 3 }} aria-hidden="true">
        {Array.from({ length: CELULAS }, (_, i) => {
          const cheia = i < cheias;
          const ponta = i === cheias - 1;
          // Tentando passar: as células piscam cheias e falham ao acaso.
          const falha = tentando && Math.random() < 0.3;
          return (
            <span
              key={i}
              style={{
                flex: 1,
                height: 12,
                clipPath: HEX_CLIP,
                background: falha ? VERDE_DIM : cheia ? (ponta ? AMBAR : VERDE) : VERDE_DIM,
                opacity: cheia ? (ponta ? 0.85 : 0.8) : 0.5,
                boxShadow: cheia ? "0 0 6px rgba(0,255,102,.5)" : undefined,
                animation: ponta && !tentando ? "bh-respira 2.2s ease-in-out infinite" : undefined,
              }}
            />
          );
        })}
      </div>
      {cena && (
        <div className={cena.saindo ? "bh-frase-p3 bh-frase-p3-sai" : "bh-frase-p3"} style={{ marginTop: 10, minHeight: "1.4em" }}>
          {fraseDigitada}
        </div>
      )}
    </div>
  );
}

// ── LOG ─────────────────────────────────────────────────────────────────────

export interface LinhaLog {
  quando: string;
  msg: string;
  tom?: "revisao" | "removido" | "corte";
}

export function Log({ linhas }: { linhas: LinhaLog[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [linhas.length]);

  return (
    <div ref={ref} style={{ maxHeight: 240, overflowY: "auto", fontSize: 12, lineHeight: 1.85 }}>
      {linhas.map((l, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            animation: "bh-entra .4s ease-out both",
            opacity: l.tom === "removido" ? 0.4 : 1,
          }}
        >
          {l.quando && <span style={{ fontFamily: LABEL, color: VERDE_APAGADO, whiteSpace: "nowrap" }}>{l.quando} -</span>}
          <span
            className={l.tom === "removido" ? undefined : "bh-verde"}
            style={{
              color: l.tom === "removido" ? VERDE_APAGADO : l.tom === "revisao" ? "#D8FFE6" : undefined,
              fontFamily: l.tom === "removido" ? LABEL : undefined,
              letterSpacing: l.tom === "removido" ? "0.18em" : undefined,
            }}
          >
            {l.msg}
          </span>
        </div>
      ))}
    </div>
  );
}
