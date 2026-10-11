// Onda de voz do P3 — compartilhada pela tela de reconhecimento (EcoScreen)
// e pela tela de apagão (ApagaoScreen). Mesma lógica da tela de relógio
// manipulado do countdown: espectro real via AnalyserNode quando o áudio toca;
// sem áudio, fala simulada (sílabas puxadas pela digitação).

const NEON = "#00FF66";
export const ONDA_BARRAS = 48;

export interface Onda {
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

export function novaOnda(): Onda {
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

// Pontuação "pesa" mais na digitação, como pausa de respiração.
export function pesoDoChar(ch: string): number {
  if (ch === "." || ch === "?" || ch === "!") return 7;
  if (ch === "," || ch === "—") return 5;
  if (ch === " ") return 1.4;
  return 1;
}

// Chamado a cada caractere digitado: é o que dá ritmo de fala à simulação.
export function ondaFala(onda: Onda, ch: string) {
  const t = performance.now();
  if (/[.,;:!?…—]/.test(ch)) onda.silaba = 0.04; // respiração
  else if (ch === " ") onda.silaba *= 0.35; // fim de palavra
  else if (t >= onda.proxSilaba) {
    onda.silaba = 0.45 + Math.random() * 0.55;
    onda.proxSilaba = t + 70 + Math.random() * 120;
  }
}

export function desenhaOnda(cv: HTMLCanvasElement, onda: Onda) {
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
