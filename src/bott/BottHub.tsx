import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AbelhaPixel } from "../app/components/AbelhaPixel";
import {
  AJUSTES_ESTADO,
  CABECALHO,
  CABECALHO_PISCA,
  CICLO_REINICIO,
  DIAGNOSTICO,
  LOG_BASE,
  LOG_FALA_CORTADA,
  LOG_MADRUGADA,
  LOG_REVISAO,
  PENSAMENTOS,
  PENSAMENTO_SOBRESCRITO,
  RITMO,
  SIGLA_PISCA_MS,
  siglaB,
  textosDoSlot,
  type EstadoMundo,
  type SlotId,
} from "../app/bott-data";
import {
  DEGRAUS,
  concluiDegrau,
  estadoMundo,
  leLog,
  leNivel,
  proximoDegrau,
  registraNoLog,
  registraVisita,
} from "../app/bott-progresso";
import { registraTesteBott } from "../app/bott-teste";
import { agora, horaSP, sincronizaHora } from "../app/hora-confiavel";
import { Entrada } from "./Entrada";
import { CSS, AMBAR, DISPLAY, LABEL, VERDE, VERDE_APAGADO } from "./estilo";
import {
  Checklist,
  Controle,
  Diagnostico,
  Log,
  Painel,
  Pensamento,
  TempoLigada,
  UltimaFala,
  type EstadoPensamento,
  type LinhaLog,
} from "./paineis";
import { Reinicio, Surto } from "./Reinicio";

// ============================================================================
// HUB DA BOTT
// ============================================================================
// Entrada (Entrada.tsx) → hub. Por visita, no máximo um degrau da escada
// (bott-progresso.ts) acontece, como um deslize no PENSAMENTO ATUAL: o texto
// aparece em âmbar, o P3 apaga com glitch, escreve PENSAMENTO_SOBRESCRITO e a
// revisão entra no log (persistida). O pensamento raro (slot "raro") e, no
// estado "nao-contaram", o slot "mundo-b" usam o mesmo caminho.
//
// Estado "contaram": a cada CICLO_REINICIO.intervaloMs, surto + reinício; o
// reinício remonta o hub (key = ciclo) e o TEMPO LIGADA buga de novo.
//
// Sigla: por um instante, o trecho CABECALHO_PISCA do cabeçalho vira siglaB()
// (SIGLA_PISCA_MS): em cada sobrescrita do P3, para quem está no nível 1 (ou
// chegando nele) e, mais longa, do nível 2 em diante; e no corte de cada
// reinício. No nível 0 não pisca.

const sorteia = (min: number, max: number) => min + Math.random() * (max - min);
const pega = <T,>(lista: T[]) => lista[Math.floor(Math.random() * lista.length)];
const dois = (n: number) => String(n).padStart(2, "0");

/** "DD/MM/████ HH:MM" na hora de Brasília. */
function carimbo(ms: number): string {
  const h = horaSP(ms);
  return `${dois(h.dia)}/${dois(h.mes)}/████ ${dois(h.hora)}:${dois(h.minuto)}`;
}

export function BottHub() {
  const visitas = useMemo(registraVisita, []);
  const estado = useMemo(estadoMundo, []);
  const [fase, setFase] = useState<"entrada" | "hub">("entrada");
  const [ciclo, setCiclo] = useState(0);
  const [reiniciando, setReiniciando] = useState(false);
  const [piscando, setPiscando] = useState(false);
  const [replaySigla, setReplaySigla] = useState(false);

  // Piscada da sigla: uma de cada vez; uma nova substitui a anterior.
  const piscaTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const piscaSigla = useCallback((ms: number) => {
    if (ms <= 0) return;
    clearTimeout(piscaTimer.current);
    setPiscando(true);
    piscaTimer.current = setTimeout(() => setPiscando(false), ms);
  }, []);
  useEffect(() => () => clearTimeout(piscaTimer.current), []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    registraTesteBott({
      sigla: () => setReplaySigla(true),
      piscaSigla: (ms?: number) => piscaSigla(ms ?? SIGLA_PISCA_MS.nivel2),
    });
  }, [piscaSigla]);

  // O degrau da visita é decidido uma vez só (depois da hora confiável) e não
  // se repete quando o hub remonta no reinício.
  const degrauDecidido = useRef(false);
  const pegaDegrau = useCallback((): SlotId | null => {
    if (degrauDecidido.current) return null;
    degrauDecidido.current = true;
    return proximoDegrau(agora());
  }, []);

  const fimEntrada = useCallback(() => setFase("hub"), []);

  return (
    <div className="bh-raiz">
      <style>{CSS}</style>
      <div className="bh-favo" />
      <div className="bh-brilho" />

      {fase === "hub" && (
        <Hub key={ciclo} estado={estado} pegaDegrau={pegaDegrau} piscando={piscando} onPisca={piscaSigla} />
      )}

      {estado === "contaram" && fase === "hub" && !reiniciando && (
        <CicloReinicio key={ciclo} onReiniciar={() => setReiniciando(true)} />
      )}
      {reiniciando && (
        <Reinicio
          atrasoMs={CICLO_REINICIO.atrasoMs}
          onInicio={() => piscaSigla(SIGLA_PISCA_MS.reinicio)}
          onApagado={() => setCiclo((c) => c + 1)}
          onFim={() => setReiniciando(false)}
        />
      )}

      {fase === "entrada" && <Entrada pulavel={visitas > 1} onFim={fimEntrada} />}
      {replaySigla && <Entrada soSigla pulavel onFim={() => setReplaySigla(false)} />}

      <div className="bh-crt-grao" />
      <div className="bh-crt-linhas" />
      <div className="bh-crt-vinheta" />
      <div className="bh-crt-flicker" />
    </div>
  );
}

// ── Estado "contaram": surto → reinício ─────────────────────────────────────

function CicloReinicio({ onReiniciar }: { onReiniciar: () => void }) {
  const [surto, setSurto] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSurto(true), CICLO_REINICIO.intervaloMs);
    return () => clearTimeout(t);
  }, []);
  if (!surto) return null;
  return <Surto fragmentos={textosDoSlot("mundo-c")} duracaoMs={CICLO_REINICIO.surtoMs} onFim={onReiniciar} />;
}

// ── Hub ─────────────────────────────────────────────────────────────────────

const PAINEIS = 6; // para as micro-falhas sortearem um

/** Duração da piscada da sigla numa sobrescrita do P3, pelo nível do visitante (0 = não pisca). */
function piscaDaSobrescrita(degrau: SlotId | null): number {
  const nivel = Math.max(leNivel(), degrau ? DEGRAUS.indexOf(degrau) + 1 : 0);
  if (nivel >= 2) return SIGLA_PISCA_MS.nivel2;
  return nivel === 1 ? SIGLA_PISCA_MS.nivel1 : 0;
}

function Hub({
  estado,
  pegaDegrau,
  piscando,
  onPisca,
}: {
  estado: EstadoMundo;
  pegaDegrau: () => SlotId | null;
  piscando: boolean;
  onPisca: (ms: number) => void;
}) {
  const aj = AJUSTES_ESTADO[estado];
  const onPiscaRef = useRef(onPisca);
  onPiscaRef.current = onPisca;
  const [pens, setPens] = useState<EstadoPensamento>(() => ({
    texto: pega(PENSAMENTOS),
    tom: "verde",
    sobrescrevendo: false,
    n: 0,
  }));
  const [deslizando, setDeslizando] = useState(false);
  const [falaEscorrega, setFalaEscorrega] = useState(false);
  const [logSalvo, setLogSalvo] = useState(leLog);
  const [logSessao, setLogSessao] = useState<{ em: number; msg: string }[]>([]);
  const [falhando, setFalhando] = useState(-1);
  const [camadaFinal, setCamadaFinal] = useState(false);
  const [, setRelogio] = useState(0);

  // Pensamentos e deslizes
  useEffect(() => {
    let vivo = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const espera = (ms: number) =>
      new Promise<void>((r) => {
        const t = setTimeout(() => {
          timers.delete(t);
          r();
        }, ms);
        timers.add(t);
      });
    let n = 0;
    let i = PENSAMENTOS.indexOf(pens.texto) + 1;
    const digitar = (texto: string) => texto.length * RITMO.digitaMs + 300;

    const deslize = async (texto: string, degrau: SlotId | null) => {
      setPens({ texto, tom: "ambar", sobrescrevendo: false, n: ++n });
      setDeslizando(true);
      await espera(digitar(texto) + RITMO.deslizeMs);
      if (!vivo) return;
      setPens((p) => ({ ...p, sobrescrevendo: true }));
      onPiscaRef.current(piscaDaSobrescrita(degrau));
      await espera(RITMO.sobrescritaMs);
      if (!vivo) return;
      setPens({ texto: PENSAMENTO_SOBRESCRITO, tom: "verde", sobrescrevendo: false, n: ++n });
      setDeslizando(false);
      registraNoLog({ em: agora(), msg: LOG_REVISAO });
      setLogSalvo(leLog());
      if (degrau) concluiDegrau(degrau);
    };

    void (async () => {
      await Promise.all([sincronizaHora(), espera(RITMO.primeiroPensamentoMs)]);
      if (!vivo) return;
      setRelogio((x) => x + 1); // hora confiável chegou: recalcula o log
      let degrau = pegaDegrau();
      if (degrau === "camada-final") {
        setCamadaFinal(true);
        degrau = null;
      }
      if (!degrau) await espera(Math.max(0, RITMO.pensamentoMs - RITMO.primeiroPensamentoMs));

      while (vivo) {
        const raro = textosDoSlot("raro");
        const mundo = textosDoSlot("mundo-b");
        const r = Math.random();
        if (degrau) {
          await deslize(textosDoSlot(degrau).join("\n"), degrau);
          degrau = null;
        } else if (r < aj.chanceRaro && raro.length) {
          await deslize(pega(raro), null);
        } else if (r < aj.chanceRaro + aj.chanceMundo && mundo.length) {
          await deslize(pega(mundo), null);
        } else {
          const texto = PENSAMENTOS[i++ % PENSAMENTOS.length];
          setPens({ texto, tom: "verde", sobrescrevendo: false, n: ++n });
          await espera(digitar(texto));
        }
        if (!vivo) return;
        await espera(RITMO.pensamentoMs);
      }
    })();

    return () => {
      vivo = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  // Relógio do log (linha da madrugada, carimbos)
  useEffect(() => {
    const iv = setInterval(() => setRelogio((x) => x + 1), 30_000);
    return () => clearInterval(iv);
  }, []);

  // Micro-falhas visuais (estados alterados)
  useEffect(() => {
    if (!aj.falhaMs) return;
    const [min, max] = aj.falhaMs;
    let t: ReturnType<typeof setTimeout>;
    const agenda = () => {
      t = setTimeout(() => {
        setFalhando(Math.floor(Math.random() * PAINEIS));
        t = setTimeout(() => {
          setFalhando(-1);
          agenda();
        }, 320);
      }, sorteia(min, max));
    };
    agenda();
    return () => clearTimeout(t);
  }, [aj.falhaMs]);

  const onCorte = useCallback(() => setLogSessao((l) => [...l, { em: agora(), msg: LOG_FALA_CORTADA }]), []);

  // LOG: linhas fixas, depois as datadas em ordem cronológica.
  const agoraMs = agora();
  const h = horaSP(agoraMs);
  const madrugada = h.hora >= LOG_MADRUGADA.inicioHora && h.hora < LOG_MADRUGADA.fimHora;
  const datadas = [
    ...logSalvo.itens,
    ...logSessao,
    ...(madrugada ? [{ em: agoraMs - 60_000 * (h.minuto % 7), msg: LOG_MADRUGADA.msg }] : []),
  ].sort((a, b) => a.em - b.em);
  const linhas: LinhaLog[] = [
    ...LOG_BASE,
    ...(madrugada ? [] : [{ quando: "", msg: LOG_MADRUGADA.fora, tom: "removido" as const }]),
    ...datadas.map((e) => ({
      quando: carimbo(e.em),
      msg: e.msg,
      tom: e.msg === LOG_REVISAO ? ("revisao" as const) : undefined,
    })),
  ];

  // Quanto o âmbar vaza por baixo do verde.
  const vaza = deslizando ? 0.45 : falaEscorrega ? 0.38 : estado === "nao-contaram" ? 0.38 : leNivel() > 0 ? 0.28 : 0.2;

  return (
    <div style={{ ["--vaza" as string]: vaza } as CSSProperties}>
      <div className="bh-mel" />

      <header className="bh-topo">
        <span style={{ color: VERDE, display: "flex", alignItems: "center", gap: 10 }}>
          <AbelhaPixel largura={26} asaMs={90} />
          <span className="bh-verde" style={{ fontFamily: DISPLAY, fontSize: 20, letterSpacing: "0.08em" }}>
            <Cabecalho piscando={piscando} />
          </span>
          <span
            aria-hidden="true"
            className="bh-hex"
            style={{ animation: "bh-respira 1.8s ease-in-out infinite" }}
          />
        </span>
        <span style={{ flex: 1 }} />
        <Controle instavel={deslizando} faixaMs={aj.controleMs} />
      </header>

      <main className="bh-conteudo">
        <div className="bh-grade">
          <Painel titulo="TEMPO LIGADA" className="bh-c5" falhando={falhando === 0}>
            <TempoLigada />
          </Painel>

          <div className="bh-c7 bh-pilha">
            <Painel titulo="ÚLTIMA FALA" escorrega={falaEscorrega} falhando={falhando === 1} atraso={80}>
              <UltimaFala chanceCorte={aj.chanceCorte} onCorte={onCorte} onEscorrega={setFalaEscorrega} />
            </Painel>
            <Painel titulo="PENSAMENTO ATUAL" escorrega={deslizando} falhando={falhando === 2} atraso={160}>
              <Pensamento p={pens} />
            </Painel>
          </div>

          <Painel titulo="CHECKLIST" className="bh-c6" falhando={falhando === 3} atraso={240}>
            <Checklist />
          </Painel>

          <Painel titulo="DIAGNÓSTICO" className="bh-c6" falhando={falhando === 4} atraso={320}>
            <Diagnostico desligamentos={DIAGNOSTICO.desligamentos} />
          </Painel>

          <Painel titulo="LOG" className="bh-c12" falhando={falhando === 5} atraso={400}>
            <Log linhas={linhas} />
          </Painel>
        </div>

        <footer style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 26 }}>
          <a className="bh-voltar" href={import.meta.env.BASE_URL}>
            &lt; VOLTAR
          </a>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: LABEL, fontSize: 9, letterSpacing: "0.2em", color: VERDE_APAGADO, opacity: 0.6 }}>
            BOTT.SYS · CANAL P3
          </span>
        </footer>
      </main>

      {camadaFinal && <SlotTela id="camada-final" onFim={() => { concluiDegrau("camada-final"); setCamadaFinal(false); }} />}
    </div>
  );
}

// ── Cabeçalho (com o trecho que pisca) ──────────────────────────────────────

const [CABECALHO_ANTES, CABECALHO_DEPOIS] = (() => {
  const i = CABECALHO.indexOf(CABECALHO_PISCA);
  return i < 0 ? [CABECALHO, ""] : [CABECALHO.slice(0, i), CABECALHO.slice(i + CABECALHO_PISCA.length)];
})();

function Cabecalho({ piscando }: { piscando: boolean }) {
  if (!piscando || !CABECALHO.includes(CABECALHO_PISCA)) return <>{CABECALHO}</>;
  return (
    <>
      {CABECALHO_ANTES}
      <span className="bh-sigla-b">{siglaB().toUpperCase()}</span>
      {CABECALHO_DEPOIS}
    </>
  );
}

// ── Tela de slot (camada final) ─────────────────────────────────────────────
// Gancho da última fase: só abre com CAMADA_FINAL_ATIVA e o slot preenchido
// (ou em `npm run dev`, via testeBott.nivel(4)).

function SlotTela({ id, onFim }: { id: SlotId; onFim: () => void }) {
  const linhas = textosDoSlot(id);
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: 24,
        background: "rgba(0,0,0,.92)",
        animation: "bh-entra .6s ease-out both",
      }}
    >
      {linhas.map((l, i) => (
        <div key={i} className="bh-ambar" style={{ fontFamily: DISPLAY, fontSize: "clamp(22px, 4vw, 34px)", textAlign: "center", maxWidth: 820 }}>
          {l}
        </div>
      ))}
      <button className="bh-voltar" style={{ color: AMBAR, opacity: 0.6 }} onClick={onFim}>
        [ FECHAR ]
      </button>
    </div>
  );
}
