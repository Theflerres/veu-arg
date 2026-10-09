import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { MotorInspect, type EstadoHud, type InfoModelo, type OpcoesMotor, type Sobreposicao } from "./motor";
import type { AbaInspect, CameraAba, EstadoPose } from "./poses";
import { CSS_INSPECT } from "./estilo";
import { CSS_CARGA, CargaFavo } from "./carga";

// Visualizador de inspeção 3D: modelo glTF numa mesa giratória (arrastar,
// zoom, toque duplo para reiniciar), palco de favo e HUD que some com H.
// Com `abas`, cada aba troca pose, rosto, câmera e painel lateral.
// O three.js fica em motor.ts; aqui só React, HUD e estados de carga/erro.

/** Intervalo médio entre os glitches verdes (com ±20% de variação). */
export const GLITCH_INTERVALO_MS = 25000;
export const GLITCH_DURACAO_MS = 220;
/** Duração do swoosh (flash hexagonal + linhas de velocidade) na troca de aba. */
export const SWOOSH_MS = 450;
/** Deslocamento horizontal mínimo (px) para o swipe no painel trocar de aba. */
export const SWIPE_MIN_PX = 45;
/** Quanto tempo o botão de reexibir fica visível com a interface escondida. */
const REEXIBIR_MS = 2600;
/** Pixels da régua por grau girado (múltiplo de 50 a cada 360° para não pular). */
const REGUA_PX_POR_GRAU = 2.5;
/** Abaixo desta largura o painel vai para baixo (layout de celular). */
const LARGURA_CELULAR = 640;
/** Largura reservada ao editor de poses no desktop (casa com o CSS dele). */
export const LARGURA_EDITOR = 300;

/** O que o editor de poses (só DEV) recebe para mexer no visualizador. */
export type ApiEditor = {
  abas: AbaInspect[];
  indice: number;
  aplicarAoVivo: (estado: EstadoPose) => void;
  lerCamera: () => CameraAba | null;
  /** Grava na aba selecionada (em memória) e devolve a aba resultante. */
  salvarNaAba: (parcial: Partial<AbaInspect>) => AbaInspect | null;
  setEditando: (sim: boolean) => void;
};
export type PropsEditor = { api: ApiEditor };

export type InspectViewerProps = {
  /** URL do .gltf/.glb (ex.: import do Vite com ?url). Vazia = erro de modelo ausente. */
  url: string;
  opcoes?: OpcoesMotor;
  /** Abas com pose/câmera/painel. Exige `opcoes.poses`. */
  abas?: AbaInspect[];
  /** Editor de poses (só DEV) — carregado com lazy() pela página. */
  editor?: ComponentType<PropsEditor>;
  /** Conteúdo próprio do painel de cada aba (no lugar de `aba.painel`). */
  renderPainel?: (aba: AbaInspect, indice: number) => ReactNode;
  /** Largura do painel lateral no desktop (px). */
  larguraLado?: number;
  /** Mostra VOLTAR (e Esc fecha). */
  onVoltar?: () => void;
  /** Avisa a aba atual (inclusive a inicial). */
  onAba?: (indice: number) => void;
  /** Troca de aba vinda de fora: muda a cada `n` novo. */
  irParaAba?: { indice: number; n: number };
  /** Rosto/contraluz por cima dos da aba. */
  sobreposicao?: Sobreposicao;
  /** O modelo terminou de carregar. */
  onPronto?: () => void;
  titulo?: string;
  subtitulo?: string;
  /** Prefixo do arquivo PNG salvo. */
  nomeCaptura?: string;
  className?: string;
  style?: CSSProperties;
};

type Fase = "carregando" | "pronto" | "erro";

const movimentoReduzido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function InspectViewer({
  url,
  opcoes,
  abas: abasIniciais,
  editor: Editor,
  renderPainel,
  larguraLado,
  onVoltar,
  onAba,
  irParaAba,
  sobreposicao = null,
  onPronto,
  titulo = "BOTT",
  subtitulo = "MODELO 3D · VISUALIZAÇÃO",
  nomeCaptura = "bott",
  className,
  style,
}: InspectViewerProps) {
  const palcoRef = useRef<HTMLDivElement>(null);
  const motorRef = useRef<MotorInspect | null>(null);
  const opcoesRef = useRef(opcoes);
  const leituraRef = useRef<Record<"rot" | "zoom" | "elev" | "fps", HTMLSpanElement | null>>({
    rot: null,
    zoom: null,
    elev: null,
    fps: null,
  });
  const reguaRef = useRef<HTMLDivElement>(null);
  const ladoRef = useRef<HTMLDivElement>(null);

  const [fase, setFase] = useState<Fase>("carregando");
  const [progresso, setProgresso] = useState<number | null>(0);
  const [erro, setErro] = useState("");
  const [uiVisivel, setUiVisivel] = useState(true);
  const [autoGiro, setAutoGiro] = useState(opcoes?.autoGiro ?? false);
  const [contextoPerdido, setContextoPerdido] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [reexibir, setReexibir] = useState(false);
  const [lento, setLento] = useState(false);
  const [semWebgl, setSemWebgl] = useState(false);
  const sobreposicaoRef = useRef(sobreposicao);
  sobreposicaoRef.current = sobreposicao;
  const onVoltarRef = useRef(onVoltar);
  onVoltarRef.current = onVoltar;
  const onProntoRef = useRef(onPronto);
  onProntoRef.current = onPronto;

  // Abas: duplicadas em memória (o editor pode reescrever a aba selecionada).
  const [abas, setAbas] = useState<AbaInspect[]>(() => abasIniciais ?? []);
  const [indice, setIndice] = useState(0);
  const [troca, setTroca] = useState({ n: 0, direcao: 1 });
  const aba: AbaInspect | undefined = abas[indice];
  const abaRef = useRef(aba);
  abaRef.current = aba;
  /** Última aba entregue ao motor (evita reaplicar a mesma). */
  const abaAplicadaRef = useRef<AbaInspect | undefined>(undefined);

  // Motor: um por URL. As opções são lidas só na criação.
  useEffect(() => {
    const palco = palcoRef.current;
    if (!palco) return;
    setFase("carregando");
    setProgresso(0);
    setErro("");

    let motor: MotorInspect;
    try {
      motor = new MotorInspect(
        palco,
        {
          progresso: setProgresso,
          pronto: (info) => {
            setFase("pronto");
            onProntoRef.current?.();
            if (import.meta.env.DEV) relataModelo(info);
          },
          erro: (msg) => {
            setFase("erro");
            setErro(msg);
          },
          hud: (e) => atualizaLeitura(e, leituraRef.current, reguaRef.current),
          contexto: setContextoPerdido,
          arrastando: setArrastando,
          lento: () => setLento(true),
        },
        { ...opcoesRef.current, autoGiro: opcoesRef.current?.autoGiro ?? false }
      );
    } catch (e) {
      setFase("erro");
      setSemWebgl(true);
      setErro(`WebGL indisponível neste navegador.\n${(e as Error).message ?? e}`);
      return;
    }
    motorRef.current = motor;
    motor.setSobreposicao(sobreposicaoRef.current);
    if (abaRef.current) motor.setAba(abaRef.current, true);
    abaAplicadaRef.current = abaRef.current;
    motor.carregar(url);
    return () => {
      motor.descartar();
      motorRef.current = null;
    };
  }, [url]);

  // Aba (ou o conteúdo dela, se o editor salvou) mudou: transição no motor.
  useEffect(() => {
    if (!aba || aba === abaAplicadaRef.current) return;
    abaAplicadaRef.current = aba;
    motorRef.current?.setAba(aba);
  }, [aba]);

  const irPara = useCallback(
    (novo: number, direcao: number) => {
      if (abas.length < 2) return;
      const i = ((novo % abas.length) + abas.length) % abas.length;
      if (i === indice) return;
      setIndice(i);
      setTroca((t) => ({ n: t.n + 1, direcao }));
    },
    [abas.length, indice]
  );
  const anterior = () => irPara(indice - 1, -1);
  const proxima = () => irPara(indice + 1, 1);

  useEffect(() => {
    motorRef.current?.setAutoGiro(autoGiro);
  }, [autoGiro]);

  useEffect(() => {
    motorRef.current?.setSobreposicao(sobreposicao);
  }, [sobreposicao]);

  useEffect(() => {
    onAba?.(indice);
  }, [indice, onAba]);

  // Troca pedida de fora (ex.: o hub pula para a aba da barra na cena do 99%).
  const irParaN = useRef(irParaAba?.n ?? 0);
  useEffect(() => {
    if (!irParaAba || irParaAba.n === irParaN.current) return;
    irParaN.current = irParaAba.n;
    irPara(irParaAba.indice, irParaAba.indice >= indice ? 1 : -1);
  }, [irParaAba, irPara, indice]);

  // Teclado: H esconde/mostra a interface; ← → trocam de aba.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;
      if (e.key === "Escape" && onVoltarRef.current) onVoltarRef.current();
      else if ((e.key === "h" || e.key === "H") && !e.repeat) setUiVisivel((v) => !v);
      else if (e.key === "ArrowLeft") irPara(indice - 1, -1);
      else if (e.key === "ArrowRight") irPara(indice + 1, 1);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [irPara, indice]);

  // Painel lateral: o motor desloca a vista para o modelo ficar na área livre.
  useEffect(() => {
    const lado = ladoRef.current;
    const motor = motorRef.current;
    if (!motor) return;
    const atualiza = () => {
      const celular = window.innerWidth < LARGURA_CELULAR;
      const editor = Editor && uiVisivel && !celular ? (LARGURA_EDITOR + 24) / 2 : 0;
      if (!uiVisivel || !lado) {
        motor.setDeslocamento(-editor, 0);
        return;
      }
      const r = lado.getBoundingClientRect();
      if (celular) motor.setDeslocamento(0, r.height * 0.35);
      else motor.setDeslocamento((r.width + 24) / 2 - editor, 0);
    };
    atualiza();
    const obs = new ResizeObserver(atualiza);
    if (lado) obs.observe(lado);
    window.addEventListener("resize", atualiza);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", atualiza);
    };
  }, [uiVisivel, fase, Editor, abas.length]);

  // Glitch verde a cada ~25 s (desligado com a interface escondida e com movimento reduzido).
  useEffect(() => {
    if (!uiVisivel || fase !== "pronto" || movimentoReduzido()) return;
    let espera = 0;
    let fim = 0;
    const agenda = () => {
      espera = window.setTimeout(() => {
        setGlitch(true);
        fim = window.setTimeout(() => {
          setGlitch(false);
          agenda();
        }, GLITCH_DURACAO_MS);
      }, GLITCH_INTERVALO_MS * (0.8 + Math.random() * 0.4));
    };
    agenda();
    return () => {
      clearTimeout(espera);
      clearTimeout(fim);
      setGlitch(false);
    };
  }, [uiVisivel, fase]);

  // Swoosh da troca de aba: some sozinho depois de SWOOSH_MS.
  const [swoosh, setSwoosh] = useState(0);
  useEffect(() => {
    if (!troca.n || movimentoReduzido()) return;
    setSwoosh(troca.n);
    const t = window.setTimeout(() => setSwoosh(0), SWOOSH_MS);
    return () => clearTimeout(t);
  }, [troca.n]);

  // Swipe horizontal no painel/abas (celular). O canvas continua girando o modelo.
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const aoIniciarSwipe = (e: ReactPointerEvent) => {
    if (e.pointerType === "mouse") return;
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const aoTerminarSwipe = (e: ReactPointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) irPara(indice + 1, 1);
      else irPara(indice - 1, -1);
    }
  };

  // Interface escondida: qualquer movimento/toque mostra, por instantes, o botão de voltar.
  const timerReexibir = useRef(0);
  const cutucaReexibir = useCallback(() => {
    if (uiVisivel) return;
    setReexibir(true);
    clearTimeout(timerReexibir.current);
    timerReexibir.current = window.setTimeout(() => setReexibir(false), REEXIBIR_MS);
  }, [uiVisivel]);
  useEffect(() => () => clearTimeout(timerReexibir.current), []);
  useEffect(() => {
    if (uiVisivel) setReexibir(false);
  }, [uiVisivel]);

  const salvarPng = () => {
    const motor = motorRef.current;
    if (!motor) return;
    const a = document.createElement("a");
    a.href = motor.capturarPng();
    a.download = `${nomeCaptura}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
    a.click();
  };

  const apiEditor = useMemo<ApiEditor>(
    () => ({
      abas,
      indice,
      aplicarAoVivo: (estado) => motorRef.current?.setPoseAoVivo(estado),
      lerCamera: () => motorRef.current?.lerCamera() ?? null,
      salvarNaAba: (parcial) => {
        const atual = abas[indice];
        if (!atual) return null;
        const nova: AbaInspect = { ...atual, ...parcial };
        setAbas((lista) => lista.map((a, i) => (i === indice ? nova : a)));
        return nova;
      },
      setEditando: (sim) => motorRef.current?.setEditando(sim),
    }),
    [abas, indice]
  );

  const classes = [
    "iv-raiz",
    !uiVisivel && "iv-sem-ui",
    arrastando && "iv-arrastando",
    glitch && "iv-glitch",
    Editor && "iv-com-editor",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const estiloRaiz = {
    ...style,
    ...(aba && { "--iv-acento": aba.contraluz }),
    ...(larguraLado && { "--iv-lado-largura": `${larguraLado}px` }),
  } as CSSProperties;
  const botaoVoltar = onVoltar && (
    <button type="button" className="iv-botao" onClick={onVoltar} title="Voltar (Esc)">
      <Icone d="M15 5l-7 7 7 7" />
      <span>VOLTAR</span>
    </button>
  );

  return (
    <div className={classes} style={estiloRaiz} onPointerMove={cutucaReexibir} onPointerDown={cutucaReexibir}>
      <style>{CSS_CARGA + CSS_INSPECT}</style>
      <div ref={palcoRef} className="iv-palco" />

      {fase === "carregando" && <CargaFavo progresso={progresso} />}

      {fase === "erro" && (
        <div className="iv-centro" role="alert">
          <svg className="iv-erro-hex" viewBox="0 0 64 64" aria-hidden="true">
            <polygon points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <polygon points="32,15 47,23.5 47,40.5 32,49 17,40.5 17,23.5" fill="none" stroke="currentColor" strokeWidth="1" opacity=".45" />
          </svg>
          <span>{semWebgl ? "MODO 3D INDISPONÍVEL NESTE NAVEGADOR" : "FALHA AO CARREGAR O MODELO"}</span>
          {import.meta.env.DEV && <div className="iv-erro-msg">{erro}</div>}
          {botaoVoltar}
        </div>
      )}

      {lento && (
        <div className="iv-centro iv-lento" role="alert">
          <span>MODO 3D PESADO DEMAIS PARA ESTE APARELHO</span>
          {botaoVoltar}
        </div>
      )}

      {contextoPerdido && (
        <div className="iv-centro" role="status">
          <svg className="iv-erro-hex" viewBox="0 0 64 64" aria-hidden="true">
            <polygon points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span>CONTEXTO WEBGL PERDIDO · RESTAURANDO</span>
        </div>
      )}

      {glitch && <div className="iv-glitch-camada" aria-hidden="true" />}
      {swoosh > 0 && uiVisivel && (
        <div key={swoosh} className={`iv-swoosh ${troca.direcao < 0 ? "esq" : "dir"}`} aria-hidden="true">
          <i className="iv-swoosh-linhas" />
          <svg className="iv-swoosh-hex" viewBox="0 0 100 100">
            <polygon points="50,4 90,27 90,73 50,96 10,73 10,27" />
          </svg>
        </div>
      )}

      <div className="iv-hud" aria-hidden={!uiVisivel}>
        <div className="iv-moldura">
          <i className="iv-canto a" />
          <i className="iv-canto b" />
          <i className="iv-canto c" />
          <i className="iv-canto d" />
          <i className="iv-marcas e" />
          <i className="iv-marcas dir" />

          <div className="iv-topo">
            <div className="iv-titulo">
              {titulo} <b>//</b> INSPEÇÃO
            </div>
            <div className="iv-sub">
              <i className="iv-hex" />
              {subtitulo}
            </div>
          </div>

          <div className="iv-leitura">
            <span>ROT</span>
            <span ref={(el) => void (leituraRef.current.rot = el)}>000°</span>
            <span>ZOOM</span>
            <span ref={(el) => void (leituraRef.current.zoom = el)}>×1.00</span>
            <span className="iv-opcional">ELEV</span>
            <span className="iv-opcional" ref={(el) => void (leituraRef.current.elev = el)}>
              +08°
            </span>
            <span className="iv-opcional">FPS</span>
            <span className="iv-opcional" ref={(el) => void (leituraRef.current.fps = el)}>
              --
            </span>
          </div>

          {aba && (
            <div
              ref={ladoRef}
              className="iv-lado"
              onPointerDown={aoIniciarSwipe}
              onPointerUp={aoTerminarSwipe}
              onPointerCancel={() => (swipe.current = null)}
            >
              <div className="iv-abas" role="tablist" aria-label="Abas de inspeção">
                {abas.map((a, i) => (
                  <button
                    key={a.id}
                    type="button"
                    role="tab"
                    id={`iv-aba-${a.id}`}
                    aria-selected={i === indice}
                    aria-controls="iv-painel"
                    tabIndex={i === indice ? 0 : -1}
                    className="iv-aba"
                    onClick={() => irPara(i, i > indice ? 1 : -1)}
                  >
                    <span className="iv-aba-num">{String(i + 1).padStart(2, "0")}</span>
                    {a.rotulo}
                  </button>
                ))}
              </div>
              {renderPainel ? (
                <div
                  key={`${aba.id}-${troca.n}`}
                  id="iv-painel"
                  role="tabpanel"
                  aria-labelledby={`iv-aba-${aba.id}`}
                  className={`iv-painel livre ${troca.direcao < 0 ? "esq" : "dir"}`}
                >
                  {renderPainel(aba, indice)}
                </div>
              ) : (
              <div
                key={`${aba.id}-${troca.n}`}
                id="iv-painel"
                role="tabpanel"
                aria-labelledby={`iv-aba-${aba.id}`}
                className={`iv-painel ${troca.direcao < 0 ? "esq" : "dir"}`}
              >
                <div className="iv-painel-topo">
                  <button type="button" className="iv-seta" onClick={anterior} aria-label="Aba anterior">
                    ‹
                  </button>
                  <h2>{aba.painel.titulo}</h2>
                  <button type="button" className="iv-seta" onClick={proxima} aria-label="Próxima aba">
                    ›
                  </button>
                </div>
                <dl>
                  {aba.painel.itens.map((item, i) => (
                    <div key={i}>
                      <dt>{item.rotulo}</dt>
                      <dd>{item.valor}</dd>
                    </div>
                  ))}
                </dl>
                <p>{aba.painel.texto}</p>
              </div>
              )}
            </div>
          )}

          <div className="iv-regua">
            <div ref={reguaRef} className="iv-regua-fita" />
          </div>

          <div className="iv-dica">
            ARRASTE · GIRAR
            <br />
            RODA / PINÇA · ZOOM
            <br />
            DUPLO CLIQUE · REINICIAR
            <br />
            {onVoltar && (
              <>
                <kbd>ESC</kbd> VOLTAR ·{" "}
              </>
            )}
            {abas.length > 1 && (
              <>
                <kbd>←</kbd> <kbd>→</kbd> ABAS ·{" "}
              </>
            )}
            <kbd>H</kbd> OCULTAR
          </div>

          <div className="iv-acoes">
            {botaoVoltar}
            <button type="button" className="iv-botao" onClick={() => motorRef.current?.reiniciar()} title="Reiniciar câmera (duplo clique)">
              <Icone d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
              <span>REINICIAR</span>
            </button>
            <button
              type="button"
              className="iv-botao"
              aria-pressed={autoGiro}
              onClick={() => setAutoGiro((v) => !v)}
              title="Girar sozinho"
            >
              <Icone d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
              <span>GIRAR</span>
            </button>
            <button type="button" className="iv-botao" onClick={salvarPng} disabled={fase !== "pronto"} title="Salvar imagem (PNG)">
              <Icone d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" />
              <span>PNG</span>
            </button>
            <button type="button" className="iv-botao" onClick={() => setUiVisivel(false)} title="Esconder interface (H)">
              <Icone d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-3 3.4M6.5 7.6C4.3 9.2 3 12 3 12s4 6 9 6a8.7 8.7 0 0 0 3.6-.8" />
              <span>OCULTAR</span>
            </button>
          </div>
        </div>
      </div>

      {!uiVisivel && (
        <button
          type="button"
          className={`iv-reexibir${reexibir ? " ativo" : ""}`}
          onClick={() => setUiVisivel(true)}
          title="Mostrar interface (H)"
          aria-label="Mostrar interface"
        >
          <Icone d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6zm9 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        </button>
      )}

      {Editor && fase === "pronto" && uiVisivel && (
        <Suspense fallback={null}>
          <Editor api={apiEditor} />
        </Suspense>
      )}
    </div>
  );
}

function Icone({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** HUD atualizado direto no DOM (~9×/s) para não renderizar o React a cada quadro. */
function atualizaLeitura(
  e: EstadoHud,
  spans: Record<"rot" | "zoom" | "elev" | "fps", HTMLSpanElement | null>,
  regua: HTMLDivElement | null
) {
  if (spans.rot) spans.rot.textContent = `${String(e.rotacao).padStart(3, "0")}°`;
  if (spans.zoom) spans.zoom.textContent = `×${e.zoom.toFixed(2)}`;
  if (spans.elev) {
    const g = Math.round(e.elevacao);
    spans.elev.textContent = `${g < 0 ? "-" : "+"}${String(Math.abs(g)).padStart(2, "0")}°`;
  }
  if (spans.fps) spans.fps.textContent = String(e.fps);
  if (regua) {
    const x = -e.rotacao * REGUA_PX_POR_GRAU;
    regua.style.backgroundPosition = `${x}px 100%, ${x}px 100%`;
  }
}

function relataModelo(info: InfoModelo) {
  console.info(
    "[inspect] modelo carregado\n" +
      `  triângulos: ${info.triangulos} · malhas: ${info.malhas} · materiais: ${info.materiais}\n` +
      `  texturas: ${info.texturas.join(", ") || "nenhuma"}\n` +
      `  esqueleto: ${info.esqueleto ? "sim" : "não"} · animações: ${info.animacoes.join(", ") || "nenhuma"}\n` +
      `  repouso: ${info.repouso}`
  );
}
