import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { abreP3Sophia, fxUrl, paraFx, playP3Sophia, p3SophiaTempo, stopP3Sophia, tocaFx } from "../sounds";
import {
  APAGAO_AUDIO,
  APAGAO_BOTAO,
  APAGAO_FALA,
  APAGAO_FRASE_CURTA,
  APAGAO_LINHA_ABERTURA,
  APAGAO_MODO_PALAVRA,
  apagaoJaVisto,
  marcaApagaoVisto,
  urlDoRelogio,
  type PalavraApagao,
} from "../apagao";
import { desenhaOnda, novaOnda, ondaFala } from "./onda-voz";

// ============================================================================
// TELA DE APAGÃO
// ============================================================================
// Substitui o site inteiro enquanto apagaoNoAr() valer (ver apagao.ts e
// useApagao.ts). Mesma família da tela do P3 do countdown e da EcoScreen:
// preta, verde, scanlines estáticas, onda de voz.
//
// 1ª visita: linha de abertura → fala → botão. Com p3-apagao.mp3 ou
// fx-emp.mp3 publicados, antes de tudo vem a porta "clique para ouvir" (o
// play precisa de um gesto do usuário). No clique toca o EMP e a tela "cai"
// no tempo dele; a voz só começa quando o EMP termina, mais
// SILENCIO_POS_EMP_S de silêncio (a linha de abertura é digitada nesse
// silêncio). Sem nenhum dos dois arquivos: sem porta, sem som. Nada além do
// EMP e da voz toca nesta tela.
//
// A fala aparece PALAVRA POR PALAVRA (APAGAO_FALA, tempos a partir do início
// da voz). Com o mp3 do P3, o relógio é o do próprio áudio e a onda reage a
// ele; sem o mp3, a mesma sequência roda em ritmo fixo e sem onda.
// APAGAO_MODO_PALAVRA: "acumula" (a linha se monta e some quando a próxima
// começa) ou "uma-por-vez" (só a palavra atual, grande). Palavras em
// unísono entram maiores, em duas cópias que se juntam com um glitch curto.
// Visitas seguintes: linha de abertura → frase curta → botão, sem som, e um
// clique (ou tecla) pula direto para o botão.

const NEON = "#00FF66";
const NEON_DIM = "rgba(0,255,102,0.45)";
const CLARO = "#e6fff0";

const ABERTURA_CHAR_S = 0.045; // linha de abertura: ritmo de terminal, uniforme
const PAUSA_DEPOIS_ABERTURA_S = 1.1;
const RESPIRO_S = 1.2; // silêncio depois da fala, antes do botão
const ESPERA_AUDIO_MS = 4000; // sondagem do arquivo de áudio
const SILENCIO_POS_EMP_S = 1.2; // fim do EMP → começo da voz
const ABERTURA_CHAR_POS_EMP_S = 0.03; // linha de abertura no silêncio depois do EMP
const QUEDA_SEM_EMP_S = 0.8; // queda da tela quando o EMP não toca
const EMP_ESPERA_MAX_S = 15; // trava de segurança se o 'ended' do EMP não chegar

// Ritmo fixo (sem o mp3 da voz, e a frase curta): cada palavra ocupa
// PALAVRA_S e a próxima entra depois da pausa da pontuação.
const PALAVRA_S = 0.42;
const PAUSA_S: Record<string, number> = { ".": 0.7, ",": 0.45, ":": 0.45 };
const PAUSA_PALAVRA_S = 0.25;

type LinhaFala = { palavras: PalavraApagao[] };

function ritmoFixo(linhas: { texto: string; unissono: boolean }[][]): LinhaFala[] {
  let t = 0;
  return linhas.map((ln) => ({
    palavras: ln.map((p) => {
      const palavra = { ...p, inicio: t, fim: t + PALAVRA_S };
      t += PALAVRA_S + (PAUSA_S[p.texto.slice(-1)] ?? PAUSA_PALAVRA_S);
      return palavra;
    }),
  }));
}

/** Duração do áudio se o arquivo existir e abrir; null se não. */
function sondaAudio(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const a = new Audio();
    a.preload = "metadata";
    let feito = false;
    const fim = (v: number | null) => {
      if (feito) return;
      feito = true;
      clearTimeout(timer);
      a.removeAttribute("src");
      resolve(v);
    };
    const timer = setTimeout(() => fim(null), ESPERA_AUDIO_MS);
    a.addEventListener("loadedmetadata", () => fim(Number.isFinite(a.duration) && a.duration > 0 ? a.duration : null), {
      once: true,
    });
    a.addEventListener("error", () => fim(null), { once: true });
    a.src = url;
  });
}

type Etapa = "carregando" | "porta" | "caindo" | "sequencia";

export function ApagaoScreen() {
  const curta = useMemo(() => apagaoJaVisto(), []);
  const urlAudio = `${import.meta.env.BASE_URL}${APAGAO_AUDIO}`;
  const [etapa, setEtapa] = useState<Etapa>(curta ? "sequencia" : "carregando");
  const [duracaoAudio, setDuracaoAudio] = useState<number | null>(null);
  const [duracaoEmp, setDuracaoEmp] = useState<number | null>(null);
  const [posClique, setPosClique] = useState(false); // a sequência vem depois do clique/EMP
  const aberturaTempos = useMemo(
    () => Array.from(APAGAO_LINHA_ABERTURA, (_, i) => i * (posClique ? ABERTURA_CHAR_POS_EMP_S : ABERTURA_CHAR_S)),
    [posClique]
  );
  const [aberturaN, setAberturaN] = useState(0);
  const [palavrasN, setPalavrasN] = useState(0); // quantas palavras já entraram
  const [botao, setBotao] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [pulou, setPulou] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const portaRef = useRef<HTMLButtonElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const pulouRef = useRef(false);
  const empFimRef = useRef(0); // performance.now() em que o EMP terminou

  // Com voz: os tempos de APAGAO_FALA. Sem voz (ou na frase curta): ritmo fixo.
  const comVoz = !curta && !!duracaoAudio;
  const fala: LinhaFala[] = useMemo(() => {
    if (curta) return ritmoFixo([APAGAO_FRASE_CURTA.split(" ").map((texto) => ({ texto, unissono: false }))]);
    if (duracaoAudio) return APAGAO_FALA;
    return ritmoFixo(APAGAO_FALA.map((ln) => ln.palavras.map(({ texto, unissono }) => ({ texto, unissono }))));
  }, [curta, duracaoAudio]);
  // Todas as palavras numa fila só, com a linha de cada uma.
  const fila = useMemo(() => fala.flatMap((ln, linha) => ln.palavras.map((p) => ({ ...p, linha }))), [fala]);

  // 1ª visita: voz do P3 ou EMP existem? Com algum deles, a porta; sem
  // nenhum, a sequência direto (muda).
  useEffect(() => {
    if (curta) return;
    let vivo = true;
    void Promise.all([sondaAudio(urlAudio), sondaAudio(fxUrl("emp"))]).then(([voz, emp]) => {
      if (!vivo) return;
      setDuracaoAudio(voz);
      setDuracaoEmp(emp);
      setEtapa(voz || emp ? "porta" : "sequencia");
    });
    return () => {
      vivo = false;
    };
  }, [curta, urlAudio]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisivel(true));
    return () => {
      cancelAnimationFrame(id);
      stopP3Sophia();
      paraFx("emp");
    };
  }, []);

  useEffect(() => {
    if (etapa === "porta") portaRef.current?.focus({ preventScroll: true });
  }, [etapa]);

  const ouvir = () => {
    if (etapa !== "porta") return;
    if (duracaoAudio) abreP3Sophia(); // síncrono, ainda dentro do gesto: destrava o <audio> da voz
    const emp = tocaFx("emp"); // também dentro do gesto
    setPosClique(true);
    setEtapa("caindo");
    const espera = (s: number) => new Promise<void>((r) => setTimeout(r, s * 1000));
    // A sequência entra quando o EMP termina (sem EMP: depois da queda curta).
    void Promise.race([Promise.all([emp, espera(QUEDA_SEM_EMP_S)]), espera(EMP_ESPERA_MAX_S)]).then(() => {
      empFimRef.current = performance.now();
      setEtapa((e) => (e === "caindo" ? "sequencia" : e));
    });
  };

  // Linha de abertura, fala, onda e botão num laço só de rAF.
  useEffect(() => {
    if (etapa !== "sequencia") return;
    const onda = novaOnda();
    const t0 = performance.now();
    const aberturaUltimo = aberturaTempos[aberturaTempos.length - 1];
    const aberturaFim = aberturaUltimo + PAUSA_DEPOIS_ABERTURA_S;
    const falaFim = fila.length ? fila[fila.length - 1].fim : 0;
    let aberturaCont = 0;
    let palavrasCont = 0;
    let falaT0 = 0; // performance.now() do início da fala (0 = ainda não)
    let ultimoT = 0;
    let comAudio = false;
    let terminou = false;
    let raf = 0;
    let vivo = true;

    const quadro = () => {
      const agoraMs = performance.now();
      const tk = (agoraMs - t0) / 1000;
      if (pulouRef.current || terminou) {
        // texto completo na tela: só a onda continua viva
        onda.falando = false;
        if (canvasRef.current) desenhaOnda(canvasRef.current, onda);
        raf = requestAnimationFrame(quadro);
        return;
      }

      let n = aberturaCont;
      while (n < aberturaTempos.length && aberturaTempos[n] <= tk) n++;
      if (n !== aberturaCont) {
        aberturaCont = n;
        setAberturaN(n);
      }

      // Depois do EMP, a voz conta a partir do fim real dele (não da montagem da tela).
      const prontaParaFalar = posClique
        ? tk >= aberturaUltimo + 0.15 && agoraMs >= empFimRef.current + SILENCIO_POS_EMP_S * 1000
        : tk >= aberturaFim;
      if (!falaT0 && prontaParaFalar) {
        falaT0 = agoraMs;
        if (comVoz) {
          comAudio = true;
          void playP3Sophia(urlAudio).then((an) => {
            if (vivo) onda.analyser = an;
          });
        }
      }

      if (falaT0) {
        // Com áudio, o relógio é o próprio áudio (os tempos das palavras contam
        // do início dele); o max impede de "desfalar" quando ele entra uns ms depois.
        const bruto = comAudio ? p3SophiaTempo() ?? (agoraMs - falaT0) / 1000 : (agoraMs - falaT0) / 1000;
        const t = (ultimoT = Math.max(ultimoT, bruto));
        let k = palavrasCont;
        while (k < fila.length && fila[k].inicio <= t) ondaFala(onda, fila[k++].texto.charAt(0));
        if (k !== palavrasCont) {
          palavrasCont = k;
          setPalavrasN(k);
        }
        onda.falando = fila.some((p) => t >= p.inicio && t < p.fim);
        if (t >= falaFim + RESPIRO_S) {
          terminou = true;
          setBotao(true);
          if (!curta) marcaApagaoVisto();
        }
      }

      if (canvasRef.current) desenhaOnda(canvasRef.current, onda);
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
    };
  }, [etapa, fila, aberturaTempos, comVoz, curta, urlAudio, posClique]);

  // Visitas seguintes: clique ou tecla pula para o botão.
  const pular = useCallback(() => {
    if (!curta || botao) return;
    pulouRef.current = true;
    setPulou(true);
    setAberturaN(APAGAO_LINHA_ABERTURA.length);
    setPalavrasN(fila.length);
    setBotao(true);
  }, [curta, botao, fila]);

  useEffect(() => {
    if (!curta || botao) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") pular();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [curta, botao, pular]);

  useEffect(() => {
    if (botao) botaoRef.current?.focus({ preventScroll: true });
  }, [botao]);

  const abreRelogio = () => {
    stopP3Sophia();
    window.location.assign(urlDoRelogio());
  };

  const naSequencia = etapa === "sequencia";
  const aberturaTexto = pulou ? APAGAO_LINHA_ABERTURA : APAGAO_LINHA_ABERTURA.slice(0, aberturaN);
  // "acumula": as palavras já ditas da linha da última palavra (a linha anterior
  // some quando a próxima começa). "uma-por-vez": só a última que entrou.
  const umaPorVez = APAGAO_MODO_PALAVRA === "uma-por-vez";
  const ultima = palavrasN > 0 ? fila[palavrasN - 1] : null;
  const naTela = !ultima
    ? []
    : umaPorVez
      ? [{ ...ultima, i: palavrasN - 1 }]
      : fila
          .slice(0, palavrasN)
          .map((p, i) => ({ ...p, i }))
          .filter((p) => p.linha === ultima.linha);

  return (
    <div
      role="main"
      aria-label="Sistema fora do ar"
      onClick={curta ? pular : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 700,
        background: "#000",
        color: NEON,
        fontFamily: "'JetBrains Mono',monospace",
        overflow: "hidden",
        opacity: visivel ? 1 : 0,
        transition: "opacity 1200ms ease",
      }}
    >
      <style>{`
        @keyframes apagao-pisca{50%{opacity:0}}
        @keyframes apagao-respira{0%,100%{opacity:.55}50%{opacity:.9}}
        .apagao-botao:hover,.apagao-botao:focus-visible{outline:none;background:rgba(0,255,102,0.12)!important;box-shadow:0 0 34px rgba(0,255,102,0.45)!important}
        .apagao-porta:focus-visible span{text-shadow:0 0 12px rgba(0,255,102,0.6)}
        @keyframes apagao-cai{0%{opacity:1;transform:none;filter:none}3%{opacity:1;transform:translateX(-6px) skewX(-8deg);filter:brightness(3) blur(1px)}6%{transform:translateX(5px) skewX(4deg);filter:brightness(2)}10%{opacity:1;transform:scaleY(.05);filter:brightness(2.6)}16%{opacity:.8;transform:scaleY(.01) scaleX(.6)}24%{opacity:.5;transform:scaleY(.01) scaleX(.02)}30%,100%{opacity:0;transform:scale(0)}}
        @keyframes apagao-clarao{0%{opacity:0}2%{opacity:.85}7%{opacity:.1}11%{opacity:.45}18%,100%{opacity:0}}
        @keyframes apagao-resto{0%,44%{opacity:0}45%{opacity:.55}46.5%{opacity:0}61%{opacity:.3}62%,100%{opacity:0}}
        .apagao-pal{display:inline-block;animation:apagao-entra .16s ease-out both}
        @keyframes apagao-entra{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
        .apagao-uni{position:relative;font-size:1.4em;color:transparent!important;text-shadow:none!important;animation:apagao-uni-tremor .3s steps(2) 1}
        .apagao-uni::before,.apagao-uni::after{content:attr(data-t);position:absolute;left:0;top:0;pointer-events:none;white-space:pre}
        .apagao-uni::before{color:${NEON};text-shadow:0 0 10px rgba(0,255,102,.6);animation:apagao-junta-a 1.4s ease-out forwards}
        .apagao-uni::after{color:${CLARO};mix-blend-mode:screen;opacity:.85;animation:apagao-junta-b 1.4s ease-out forwards}
        @keyframes apagao-junta-a{0%{transform:translate(-8px,3px);clip-path:inset(0 0 55% 0)}7%{transform:translate(5px,-2px);clip-path:inset(40% 0 0 0)}14%{transform:translate(-6px,2px);clip-path:none}100%{transform:none}}
        @keyframes apagao-junta-b{0%{transform:translate(8px,-3px);clip-path:inset(50% 0 0 0)}7%{transform:translate(-5px,2px);clip-path:inset(0 0 45% 0)}14%{transform:translate(6px,-2px);clip-path:none}100%{transform:none}}
        @keyframes apagao-uni-tremor{0%{transform:translateX(-3px) skewX(-6deg)}50%{transform:translateX(3px) skewX(4deg)}100%{transform:none}}
      `}</style>

      {/* Queda (depois do clique): o texto da porta colapsa no tempo do EMP */}
      {etapa === "caindo" && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 24px",
              fontSize: 15,
              letterSpacing: 1.5,
              textAlign: "center",
              animation: `apagao-cai ${duracaoEmp ?? QUEDA_SEM_EMP_S}s linear both`,
            }}
          >
            &gt;&gt; CANAL DE VOZ: P3 — [ clique para ouvir ]
          </div>
          <div
            style={{
              position: "absolute",
              left: "10%",
              right: "10%",
              top: "50%",
              height: 1,
              background: NEON,
              boxShadow: "0 0 12px rgba(0,255,102,0.8)",
              animation: `apagao-resto ${duracaoEmp ?? QUEDA_SEM_EMP_S}s linear both`,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#d8ffe4",
              mixBlendMode: "screen",
              animation: `apagao-clarao ${duracaoEmp ?? QUEDA_SEM_EMP_S}s linear both`,
            }}
          />
        </div>
      )}

      {/* Porta (com voz ou EMP, na 1ª visita): a tela inteira é o botão */}
      {(etapa === "porta" || etapa === "carregando") && (
        <button
          ref={portaRef}
          className="apagao-porta"
          onClick={ouvir}
          disabled={etapa !== "porta"}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 24px",
            background: "transparent",
            border: "none",
            outline: "none",
            color: NEON,
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 15,
            letterSpacing: 1.5,
            textAlign: "center",
            cursor: etapa === "porta" ? "pointer" : "default",
          }}
        >
          {etapa === "porta" && (
            <span style={{ animation: "apagao-respira 4s ease-in-out infinite" }}>
              &gt;&gt; CANAL DE VOZ: P3 — [ clique para ouvir ]
            </span>
          )}
        </button>
      )}

      {/* Sequência */}
      <div
        aria-hidden={!naSequencia}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          padding: "64px 24px 40px",
          overflowY: "auto",
          opacity: naSequencia ? 1 : 0,
          pointerEvents: naSequencia ? "auto" : "none",
          transition: "opacity 0.9s ease",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            right: 24,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 12,
            letterSpacing: 1.5,
            color: NEON_DIM,
          }}
        >
          <span style={{ animation: "apagao-respira 4s ease-in-out infinite" }}>&gt;&gt; CANAL DE VOZ: P3</span>
          <span>&gt;&gt; SISTEMA: FORA DO AR</span>
        </div>

        {comVoz && (
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{ position: "relative", width: "min(760px, 100%)", height: 120, display: "block", flexShrink: 0 }}
          />
        )}

        <div
          aria-live="polite"
          style={{ position: "relative", width: "min(760px, 100%)", minHeight: curta ? 90 : 150, lineHeight: 1.6 }}
        >
          <p
            style={{
              margin: "0 0 1em",
              minHeight: "1.6em",
              fontSize: 15,
              letterSpacing: 2,
              color: NEON,
              textShadow: "0 0 10px rgba(0,255,102,0.5)",
            }}
          >
            {aberturaTexto}
            {aberturaTexto.length < APAGAO_LINHA_ABERTURA.length && naSequencia && (
              <span style={{ animation: "apagao-pisca 0.9s steps(1) infinite" }}>█</span>
            )}
          </p>
          <p
            style={{
              margin: 0,
              minHeight: "2.4em",
              fontSize: umaPorVez ? "clamp(30px, 6vw, 52px)" : 24,
              letterSpacing: umaPorVez ? 1 : 0.4,
              lineHeight: 1.5,
              textAlign: umaPorVez ? "center" : "left",
              color: "#b8ffcb",
              textShadow: "0 0 8px rgba(0,255,102,0.4)",
            }}
          >
            {naTela.map((p, j) => (
              <Fragment key={p.i}>
                {j > 0 && " "}
                <span
                  className={p.unissono ? "apagao-pal apagao-uni" : "apagao-pal"}
                  data-t={p.unissono ? p.texto : undefined}
                >
                  {p.texto}
                </span>
              </Fragment>
            ))}
          </p>
        </div>

        <button
          ref={botaoRef}
          className="apagao-botao"
          onClick={(e) => {
            e.stopPropagation();
            abreRelogio();
          }}
          tabIndex={botao ? 0 : -1}
          aria-hidden={!botao}
          style={{
            position: "relative",
            flexShrink: 0,
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: "clamp(20px, 2.6vw, 28px)",
            letterSpacing: "0.22em",
            color: NEON,
            background: "rgba(2,5,3,0.95)",
            border: `1px solid ${NEON}`,
            boxShadow: "0 0 22px rgba(0,255,102,0.3)",
            padding: "16px 38px",
            cursor: botao ? "pointer" : "default",
            opacity: botao ? 1 : 0,
            pointerEvents: botao ? "auto" : "none",
            transition: "opacity 0.9s ease, background 0.2s, box-shadow 0.2s",
          }}
        >
          {APAGAO_BOTAO}
        </button>

        {curta && !botao && naSequencia && (
          <div style={{ position: "absolute", bottom: 18, fontSize: 11, letterSpacing: 1.5, color: NEON_DIM }}>
            [ clique para pular ]
          </div>
        )}
      </div>

      {/* Scanlines e vinheta, estáticas — textura de CRT, sem glitch */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.3) 3px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 100%)",
        }}
      />
    </div>
  );
}
