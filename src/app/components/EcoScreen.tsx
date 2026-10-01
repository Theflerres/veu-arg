import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { abreP3Sophia, playP3Sophia, p3SophiaTempo, stopP3Sophia } from "../sounds";

// ============================================================================
// ECO — tela de reconhecimento pessoal
// ============================================================================
// Não tem entrada em menu, ícone nem atalho: só abre com ?eco=<chave> na URL
// (ver ecoPedido). A chave não fica no código — só o SHA-256 dela, igual à
// senha do terminal — e é ela que decifra as falas (ver P3_SOPHIA_FALA).
//
// Mesma família da tela do P3 de relógio manipulado (countdown), em tom calmo:
// só verde, sem glitch, entrada e saída por fade. Começa por um clique (ver
// EcoScreen), para o navegador deixar a voz tocar. A onda reaproveita a lógica
// do countdown — espectro real via AnalyserNode quando o áudio toca, fala
// simulada (sílabas puxadas pela digitação) se mesmo assim ele não tocar.

const NEON = "#00FF66";
const NEON_DIM = "rgba(0,255,102,0.45)";

const ECO_PARAM = "eco";
const ECO_HASH = "fb0b92f9eb8378e4b204ca4db697b3bfe5c3f3d3c47397f3869e8f3aa3154bf8";

/** A URL traz o parâmetro? (síncrono — decide se vale esperar o hash) */
export function temParamEco(): boolean {
  try {
    return new URLSearchParams(window.location.search).has(ECO_PARAM);
  } catch {
    return false;
  }
}

/** A chave da URL, se ela bater com o hash — é ela que decifra as falas. */
export async function ecoPedido(): Promise<string | null> {
  try {
    const valor = new URLSearchParams(window.location.search).get(ECO_PARAM);
    if (!valor) return null;
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(valor));
    const hex = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
    return hex === ECO_HASH ? valor : null;
  } catch {
    // sem crypto.subtle (contexto não seguro): a tela simplesmente não existe
    return null;
  }
}

/** Tira o parâmetro da barra de endereço, para um F5 não repetir a tela. */
export function limpaParamEco() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(ECO_PARAM);
    window.history.replaceState(window.history.state, "", url);
  } catch {
    /* ignore */
  }
}

// ── Fala ────────────────────────────────────────────────────────────────────
// Três frases que se acumulam na tela. Cada uma digita a partir do próprio
// `inicio` e termina MARGEM_S antes da seguinte começar; a última termina
// FIM_ANTES_S antes do fim do áudio. RESPIRO_S de silêncio depois do áudio e
// entra o botão.
//
// Os textos ficam CIFRADOS no código (`cifra`): XOR dos bytes UTF-8 da frase
// com os bytes UTF-8 da chave da URL, repetida em ciclo, e o resultado em
// base64. Não é criptografia forte — só impede que a mensagem seja lida no JS
// publicado sem a URL certa. Para mudar uma frase, gere a cifra nova com:
//
//   node -e "const k=Buffer.from('CHAVE');const b=Buffer.from(process.argv[1]);console.log(Buffer.from(b.map((x,i)=>x^k[i%k.length])).toString('base64'))" "TEXTO NOVO"
//
// O ÁUDIO segue o mesmo esquema, byte a byte: o arquivo público é
// `public/sounds/eco-02.bin` (o mp3 cifrado, sem nome que o denuncie). O mp3
// original NÃO pode ficar em public/ (tudo ali vai pro ar) nem no git (o
// repositório é público) — mora em `audio-original/`, que está no .gitignore.
// Para gerar o .bin a partir de um mp3 novo:
//
//   node -e "const fs=require('fs');const k=Buffer.from('CHAVE');const b=fs.readFileSync('audio-original/p3-sophia.mp3');fs.writeFileSync('public/sounds/eco-02.bin',Buffer.from(b.map((x,i)=>x^k[i%k.length])))"
//
// (CHAVE = o valor de ?eco=, o mesmo que gerou ECO_HASH lá em cima.) Trocar a
// chave exige recifrar as três frases E o áudio, e atualizar ECO_HASH. Se o
// áudio mudar de duração, ajuste duracaoTotal e os `inicio` das frases.

const P3_SOPHIA_FALA = {
  frases: [
    { cifra: "IAAAAAAAA0ZBTgIEAQwVCgBBTAQIAVIFGgkVGgwPWQ1PCx9BBQATq8NP", inicio: 2.78 },
    { cifra: "NgETBwcVXwcaThNBAwACHAhBXB0KThcUUwsVAREEREgKAAYTFg4SDRsVTEgfHBNBBwoDHAgTDRkaCx9BAw4DGwgTRAlPHh0TUw4BHQBBz+j7ThdBHazTB0kVSAYbAQdBEg0CARtP", inicio: 7.5 },
    { cifra: "OhwDB0kFRBJPAxMIAE8DBwsTSEgZARGi2U8UB0kQWA1PHwcAHx4FDRtBXg0BBhNBAwAUDRsITEgdCwQEHw4CRkkuTxoGCRMFHE8ABxtBXw0cHhcIBw4CSAZBRwcIAVIVEgEEB0kQWAkBGh1BFgMVSAQEXw0MC1ISFh1QGgwSXQ0GGhMFHEE=", inicio: 15.64 },
  ],
  duracaoTotal: 26.78,
};

const ECO_AUDIO = `${import.meta.env.BASE_URL}sounds/eco-02.bin`;

// XOR é a própria inversa: a mesma função cifra e decifra.
function xorComChave(bytes: Uint8Array, chave: string): Uint8Array {
  const k = new TextEncoder().encode(chave);
  for (let i = 0; i < bytes.length; i++) bytes[i] ^= k[i % k.length];
  return bytes;
}

function decifra(cifra: string, chave: string): string {
  const b = Uint8Array.from(atob(cifra), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(xorComChave(b, chave));
}

/** Baixa e decifra o áudio; devolve uma URL local (blob:) do mp3, ou null. */
async function preparaAudio(chave: string): Promise<string | null> {
  try {
    const resp = await fetch(ECO_AUDIO);
    if (!resp.ok) return null;
    const bytes = xorComChave(new Uint8Array(await resp.arrayBuffer()), chave);
    return URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
  } catch {
    return null; // sem rede / sem arquivo: a fala segue com a onda simulada
  }
}

interface Frase {
  texto: string;
  inicio: number;
  /** Horário (s) de cada caractere. */
  tempos: number[];
}

const MARGEM_S = 0.3;
const FIM_ANTES_S = 1;
const RESPIRO_S = 1.5;
const FADE_ENTRADA_MS = 1400;
const FADE_SAIDA_MS = 600;

// Mesmo peso da tela de timeout: pontuação "pesa" mais, como pausa de respiração.
function pesoDoChar(ch: string): number {
  if (ch === "." || ch === "?" || ch === "!") return 7;
  if (ch === "," || ch === "—") return 5;
  if (ch === " ") return 1.4;
  return 1;
}

// Decifra as frases e marca o horário (s) de cada caractere; o peso de um
// caractere é a pausa DEPOIS dele, e o último cai exatamente no fim da janela
// da frase.
function montaFala(chave: string): Frase[] {
  return P3_SOPHIA_FALA.frases.map((frase, i, frases) => {
    const fim =
      i < frases.length - 1
        ? frases[i + 1].inicio - MARGEM_S
        : P3_SOPHIA_FALA.duracaoTotal - FIM_ANTES_S;
    const texto = decifra(frase.cifra, chave);
    const acum = [0];
    for (let k = 0; k < texto.length - 1; k++) acum.push(acum[k] + pesoDoChar(texto.charAt(k)));
    const total = acum[acum.length - 1] || 1;
    const tempos = acum.map((a) => frase.inicio + ((fim - frase.inicio) * a) / total);
    return { texto, inicio: frase.inicio, tempos };
  });
}

const BOTAO_EM_S = P3_SOPHIA_FALA.duracaoTotal + RESPIRO_S;

// ── Onda de voz ─────────────────────────────────────────────────────────────

const ONDA_BARRAS = 48;

interface Onda {
  barras: Float32Array;
  fase: number[];
  vel: number[];
  analyser: AnalyserNode | null;
  dados: Uint8Array | null;
  falando: boolean;
  energia: number;
  silaba: number;
  proxSilaba: number;
}

function novaOnda(): Onda {
  return {
    barras: new Float32Array(ONDA_BARRAS),
    fase: Array.from({ length: ONDA_BARRAS }, () => Math.random() * Math.PI * 2),
    vel: Array.from({ length: ONDA_BARRAS }, () => 5 + Math.random() * 9),
    analyser: null,
    dados: null,
    falando: false,
    energia: 0,
    silaba: 0,
    proxSilaba: 0,
  };
}

// Chamado a cada caractere digitado: é o que dá ritmo de fala à simulação.
function ondaFala(onda: Onda, ch: string) {
  const t = performance.now();
  if (/[.,;:!?…—]/.test(ch)) onda.silaba = 0.04; // respiração
  else if (ch === " ") onda.silaba *= 0.35; // fim de palavra
  else if (t >= onda.proxSilaba) {
    onda.silaba = 0.45 + Math.random() * 0.55;
    onda.proxSilaba = t + 70 + Math.random() * 120;
  }
}

function desenhaOnda(cv: HTMLCanvasElement, onda: Onda) {
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth;
  const h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  const g = cv.getContext("2d");
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  const t = performance.now() / 1000;
  const c = (ONDA_BARRAS - 1) / 2;
  if (onda.analyser) {
    if (!onda.dados) onda.dados = new Uint8Array(onda.analyser.frequencyBinCount);
    onda.analyser.getByteFrequencyData(onda.dados);
  } else {
    onda.energia += ((onda.falando ? 1 : 0.07) - onda.energia) * 0.08;
    onda.silaba *= 0.94;
  }

  for (let i = 0; i < ONDA_BARRAS; i++) {
    const k = Math.abs(i - c) / c; // 0 no centro, 1 nas pontas
    const repouso = 0.025 + 0.015 * Math.sin(t * 2 + i * 0.35);
    let alvo: number;
    if (onda.analyser && onda.dados) {
      const v = onda.dados[1 + Math.floor(k * 44)] / 255;
      alvo = Math.max(repouso, Math.pow(v, 1.3));
    } else {
      const envelope = 0.2 + 0.8 * Math.exp(-Math.pow(k * 1.6, 2));
      const ruido = 0.6 * (0.5 + 0.5 * Math.sin(t * onda.vel[i] + onda.fase[i])) + 0.4 * Math.random();
      const nivel = onda.energia * (0.2 + 0.8 * onda.silaba);
      alvo = Math.max(repouso, nivel * envelope * ruido);
    }
    const b = onda.barras[i];
    onda.barras[i] = b + (alvo - b) * (alvo > b ? 0.5 : 0.16);
  }

  g.fillStyle = "rgba(0,255,102,0.14)";
  g.fillRect(0, Math.round(h / 2), w, 1);

  const passo = w / ONDA_BARRAS;
  const larg = Math.max(2, passo * 0.55);
  g.fillStyle = NEON;
  g.shadowColor = "rgba(0,255,102,0.5)";
  g.shadowBlur = 10;
  for (let i = 0; i < ONDA_BARRAS; i++) {
    const alt = Math.max(2, Math.min(1, onda.barras[i]) * h * 0.92);
    g.fillRect(i * passo + (passo - larg) / 2, (h - alt) / 2, larg, alt);
  }
  g.shadowBlur = 0;
}

// ── Tela ────────────────────────────────────────────────────────────────────
// Duas etapas: "porta" (tela preta, só o convite para clicar) e "fala". O
// clique existe por causa do bloqueio de autoplay: sem um gesto do usuário o
// navegador não deixa a voz tocar, e quem chega por um link nunca clicou em
// nada no site. Por isso o play() sai DENTRO do handler do clique — o Safari
// não aceita nem um await entre o gesto e o play().
//
// O áudio é baixado e decifrado em segundo plano assim que a porta monta, então
// na prática ele já está pronto no clique. Conexão lenta: o clique destrava o
// <audio> (abreP3Sophia), a porta mostra "sintonizando", e a fala começa junto
// com o play(), assim que a decifragem terminar — sem espera artificial.

type Etapa = "porta" | "sintonizando" | "fala";

export function EcoScreen({ chave, onClose }: { chave: string; onClose: () => void }) {
  const fala = useMemo(() => montaFala(chave), [chave]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const portaRef = useRef<HTMLButtonElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<Promise<AnalyserNode | null> | null>(null);
  // URL blob: do mp3 decifrado — undefined enquanto prepara, null se falhou
  const audioUrlRef = useRef<string | null | undefined>(undefined);
  const preparoRef = useRef<Promise<string | null> | null>(null);
  const montadaRef = useRef(true);
  const [etapa, setEtapa] = useState<Etapa>("porta");
  const [visivel, setVisivel] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [digitados, setDigitados] = useState<number[]>(() => fala.map(() => 0));
  const [botao, setBotao] = useState(false);

  // Baixa e decifra o áudio já na porta; a URL local é liberada ao fechar.
  useEffect(() => {
    montadaRef.current = true;
    let viva = true;
    preparoRef.current = preparaAudio(chave).then((url) => {
      if (!viva) {
        if (url) URL.revokeObjectURL(url);
        return null;
      }
      audioUrlRef.current = url;
      return url;
    });
    return () => {
      viva = false;
      montadaRef.current = false;
      stopP3Sophia();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = undefined;
    };
  }, [chave]);

  const comecaFala = (url: string | null) => {
    audioRef.current = url ? playP3Sophia(url) : Promise.resolve(null);
    setEtapa("fala");
  };

  const ouvir = () => {
    if (etapa !== "porta" || saindo) return;
    abreP3Sophia(); // síncrono, ainda dentro do gesto
    const url = audioUrlRef.current;
    if (url !== undefined) {
      comecaFala(url); // caminho normal: play() neste mesmo tique
      return;
    }
    setEtapa("sintonizando");
    preparoRef.current?.then((pronta) => {
      if (montadaRef.current) comecaFala(pronta);
    });
  };

  // Relógio da fala, digitação e onda num laço só de rAF — a partir do clique.
  useEffect(() => {
    if (etapa !== "fala") return;
    const onda = novaOnda();
    const inicio = performance.now();
    const contagem = fala.map(() => 0);
    let ultimoT = 0;
    let raf = 0;
    let vivo = true;

    audioRef.current?.then((an) => {
      if (vivo) onda.analyser = an;
    });

    const quadro = () => {
      // Relógio = o próprio áudio enquanto toca (sincronia real com a voz);
      // sem áudio, o tempo desde o clique. O max impede o texto de
      // "desdigitar" quando o áudio entra alguns ms depois.
      const t = (ultimoT = Math.max(ultimoT, p3SophiaTempo() ?? (performance.now() - inicio) / 1000));

      let mudou = false;
      onda.falando = false;
      fala.forEach((frase, i) => {
        const { tempos } = frase;
        if (t >= frase.inicio && t < tempos[tempos.length - 1]) onda.falando = true;
        let n = contagem[i];
        while (n < tempos.length && tempos[n] <= t) ondaFala(onda, frase.texto.charAt(n++));
        if (n !== contagem[i]) {
          contagem[i] = n;
          mudou = true;
        }
      });
      if (mudou) setDigitados(contagem.slice());

      if (canvasRef.current) desenhaOnda(canvasRef.current, onda);

      if (t >= BOTAO_EM_S) setBotao(true);
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);

    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      stopP3Sophia();
    };
  }, [etapa, fala]);

  // Entrada por fade: um quadro em opacidade 0 antes de ligar a transição.
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisivel(true));
    portaRef.current?.focus({ preventScroll: true }); // Enter/Espaço também abrem
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (botao) botaoRef.current?.focus({ preventScroll: true });
  }, [botao]);

  const fechar = useCallback(() => {
    if (saindo) return;
    setSaindo(true);
    stopP3Sophia();
    setTimeout(onClose, FADE_SAIDA_MS);
  }, [saindo, onClose]);

  // Esc fecha, igual a sair pelo botão — nas duas etapas.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fechar]);

  // Cursor fica na frase em digitação; entre frases, na última que já começou.
  const fraseAtiva = digitados.reduce((ativa, n, i) => (n > 0 ? i : ativa), -1);
  const naFala = etapa === "fala";
  const naPorta = etapa === "porta";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Canal de voz: P3"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 700,
        background: "#000",
        color: NEON,
        fontFamily: "'JetBrains Mono',monospace",
        overflow: "hidden",
        opacity: visivel && !saindo ? 1 : 0,
        transition: `opacity ${saindo ? FADE_SAIDA_MS : FADE_ENTRADA_MS}ms ease`,
      }}
    >
      <style>{`
        @keyframes eco-pisca{50%{opacity:0}}
        @keyframes eco-respira{0%,100%{opacity:.55}50%{opacity:.9}}
        .eco-voltar:hover,.eco-voltar:focus-visible{outline:none;border-color:${NEON};box-shadow:0 0 18px rgba(0,255,102,0.28)}
        .eco-porta:focus-visible span{text-shadow:0 0 12px rgba(0,255,102,0.6)}
      `}</style>

      {/* Etapa 1 — a porta: a tela inteira é o botão */}
      <button
        ref={portaRef}
        className="eco-porta"
        onClick={ouvir}
        disabled={!naPorta}
        tabIndex={naPorta ? 0 : -1}
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
          cursor: naPorta ? "pointer" : "default",
          opacity: naFala ? 0 : 1,
          pointerEvents: naFala ? "none" : "auto",
          transition: "opacity 0.6s ease",
        }}
      >
        <span style={{ animation: "eco-respira 4s ease-in-out infinite" }}>
          &gt;&gt; CANAL DE VOZ: P3 — [ {naPorta ? "clique para ouvir" : "sintonizando…"} ]
        </span>
      </button>

      {/* Etapa 2 — a fala */}
      <div
        aria-hidden={!naFala}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: "40px 24px",
          opacity: naFala ? 1 : 0,
          pointerEvents: naFala ? "auto" : "none",
          transition: "opacity 0.9s ease",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 40,
            right: 40,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            fontSize: 12,
            letterSpacing: 1.5,
            color: NEON_DIM,
          }}
        >
          <span style={{ animation: "eco-respira 4s ease-in-out infinite" }}>&gt;&gt; CANAL DE VOZ: P3</span>
          <span>&gt;&gt; SESSÃO: ECO</span>
        </div>

        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{ position: "relative", width: "min(760px, 100%)", height: 150, display: "block" }}
        />

        <div
          aria-live="polite"
          style={{
            position: "relative",
            width: "min(760px, 100%)",
            minHeight: 230,
            fontSize: 19,
            lineHeight: 1.65,
            letterSpacing: 0.3,
          }}
        >
          {fala.map((frase, i) =>
            digitados[i] > 0 ? (
              <p
                key={i}
                style={{
                  margin: "0 0 0.6em",
                  whiteSpace: "pre-wrap",
                  color: "#b8ffcb",
                  textShadow: "0 0 8px rgba(0,255,102,0.4)",
                }}
              >
                {frase.texto.slice(0, digitados[i])}
                {i === fraseAtiva && !botao && (
                  <span style={{ animation: "eco-pisca 0.9s steps(1) infinite" }}>█</span>
                )}
              </p>
            ) : null
          )}
        </div>

        <button
          ref={botaoRef}
          className="eco-voltar"
          onClick={fechar}
          tabIndex={botao ? 0 : -1}
          aria-hidden={!botao}
          style={{
            position: "relative",
            fontFamily: "'Share Tech Mono',monospace",
            fontSize: 13,
            letterSpacing: "0.18em",
            color: NEON,
            background: "rgba(2,5,3,0.95)",
            border: "1px solid rgba(0,255,102,0.28)",
            padding: "8px 22px",
            cursor: botao ? "pointer" : "default",
            opacity: botao ? 1 : 0,
            pointerEvents: botao ? "auto" : "none",
            transition: "opacity 0.9s ease, border-color 0.2s, box-shadow 0.2s",
          }}
        >
          &lt; VOLTAR
        </button>
      </div>

      {/* Scanlines e vinheta, estáticas — o CRT aqui é textura, não ruído */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.3) 3px)",
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
