const BASE = import.meta.env.BASE_URL;

export const SOUND_FILES = {
  click: "click.mp3",
  back: "back.mp3",
  error: "error.mp3",
  success: "success.mp3",
  glitch: "glitch.mp3",
  background: "background.mp3",
  jingle: "jingle.mp3",
  heartbeat: "heartbeat.mp3",
  chat: "Chat.mp3", // nome do arquivo com "C" maiúsculo — GitHub Pages é case-sensitive
  hunterWest: "hunter-west.mp3", // easter egg do Scanner — som próprio, nada reaproveitado
  p3Timeout: "p3-timeout.mp3", // fala do P3 quando o relógio do sistema foi mexido (countdown)
} as const;

export type SoundName = keyof typeof SOUND_FILES;

const cache = new Map<SoundName, HTMLAudioElement>();
let glitchLoop: HTMLAudioElement | null = null;
let glitchFallbackInterval: ReturnType<typeof setInterval> | null = null;
// Instâncias criadas na hora (jingle) — registradas para o stopAllAudio() alcançar.
const looseSounds = new Set<HTMLAudioElement>();

function soundUrl(name: SoundName): string {
  return `${BASE}sounds/${SOUND_FILES[name]}`;
}

function getAudio(name: SoundName): HTMLAudioElement {
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(soundUrl(name));
    cache.set(name, audio);
  }
  return audio;
}

function playOscillatorBeep(freq = 800, dur = 0.05, vol = 0.04) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = "square";
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {
    /* ignore */
  }
}

async function play(name: SoundName, volume = 0.45): Promise<boolean> {
  try {
    const audio = getAudio(name);
    audio.volume = volume;
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

export async function playClick() {
  if (!(await play("click", 0.35))) playOscillatorBeep(660, 0.06, 0.04);
}

export async function playBack() {
  if (!(await play("back", 0.35))) playOscillatorBeep(440, 0.06, 0.04);
}

export async function playError() {
  if (!(await play("error", 0.5))) {
    playOscillatorBeep(220, 0.15, 0.06);
    setTimeout(() => playOscillatorBeep(180, 0.2, 0.05), 120);
  }
}

export async function playSuccess() {
  if (!(await play("success", 0.45))) {
    playOscillatorBeep(440, 0.08, 0.04);
    setTimeout(() => playOscillatorBeep(660, 0.08, 0.04), 80);
    setTimeout(() => playOscillatorBeep(880, 0.12, 0.04), 160);
  }
}

// Evento A (Chat) — toca ao abrir o widget de chat flutuante
export async function playChatSound() {
  if (!(await play("chat", 0.5))) {
    playOscillatorBeep(700, 0.05, 0.04);
    setTimeout(() => playOscillatorBeep(900, 0.05, 0.04), 90);
  }
}

export function startGlitchSound() {
  try {
    if (!glitchLoop) {
      glitchLoop = new Audio(soundUrl("glitch"));
      glitchLoop.loop = true;
    }
    glitchLoop.volume = 0.35;
    glitchLoop.currentTime = 0;
    void glitchLoop.play().catch(() => {
      if (glitchFallbackInterval) return;
      glitchFallbackInterval = setInterval(() => {
        playOscillatorBeep(100 + Math.random() * 400, 0.06 + Math.random() * 0.1, 0.06);
      }, 150);
    });
  } catch {
    /* ignore */
  }
}

export function stopGlitchSound() {
  if (glitchFallbackInterval) {
    clearInterval(glitchFallbackInterval);
    glitchFallbackInterval = null;
  }
  if (glitchLoop) {
    glitchLoop.pause();
    glitchLoop.currentTime = 0;
  }
}

// Evento B — toca glitch.mp3 uma única vez, do início ao fim, sem loop.
// Usa uma instância própria (não a `glitchLoop` do MeltOverlay) para não interferir
// com o loop de glitch usado no fluxo de senha incorreta.
export async function playGlitchOnce() {
  if (!(await play("glitch", 0.5))) {
    playOscillatorBeep(120, 0.3, 0.06);
  }
}

// ── MÚSICA AMBIENTE ─────────────────────────────────────────────────────────
//  toca em loop contínuo; jingle.mp3 aparece periodicamente
// "solto" por cima, sem parar nenhum áudio já tocando (instância própria).

export const AMBIENT_CONFIG = {
  JINGLE_INTERVAL_MS: 20 * 60 * 1000, // a cada 20 minutos
};

let bgMusic: HTMLAudioElement | null = null;
let heartbeatLoop: HTMLAudioElement | null = null;
let hunterWestSound: HTMLAudioElement | null = null;
let p3TimeoutSound: HTMLAudioElement | null = null;

export function startBackgroundMusic(volume = 0.18) {
  try {
    if (!bgMusic) {
      bgMusic = new Audio(soundUrl("background"));
      bgMusic.loop = true;
    }
    bgMusic.volume = volume;
    void bgMusic.play().catch(() => {
      /* autoplay bloqueado pelo navegador — ignora, sem som ambiente até o próximo gesto do usuário */
    });
  } catch {
    /* ignore */
  }
}

export function stopBackgroundMusic() {
  if (bgMusic) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }
}

export function playJingle(volume = 0.4) {
  try {
    const jingle = new Audio(soundUrl("jingle"));
    jingle.volume = volume;
    looseSounds.add(jingle);
    jingle.addEventListener("ended", () => looseSounds.delete(jingle), { once: true });
    void jingle.play().catch(() => {
      looseSounds.delete(jingle);
    });
  } catch {
    /* ignore */
  }
}

// ── SILÊNCIO TOTAL ──────────────────────────────────────────────────────────
// Para tudo que estiver tocando: música ambiente, jingles soltos, loop de
// glitch e qualquer efeito em cache. Usado ao entrar na tela de um Grupo.

export function stopAllAudio() {
  stopBackgroundMusic();
  stopGlitchSound();
  stopHeartbeat();
  stopHunterWest();
  stopP3Timeout();
  stopP3Sophia();

  for (const audio of cache.values()) {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
  }

  for (const audio of looseSounds) {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
  looseSounds.clear();
}

// ── PAUSA E RETOMA ──────────────────────────────────────────────────────────
// Para um overlay que entra por cima de qualquer tela (Interceptação): pausa
// o que estiver tocando, sem zerar, e devolve a função que retoma de onde
// parou. Só retoma o que ainda é o áudio vigente — o que foi parado/trocado
// nesse meio-tempo (ex: a música ambiente reiniciada pelo terminal) fica.
//
// O countdown roda num iframe isolado (TimerOverlay.tsx), fora do alcance
// daqui: ele recebe "pausarAudio"/"retomarAudio" por postMessage e cuida do
// próprio som (listener em timer/index.html).

function avisaIframes(tipo: "pausarAudio" | "retomarAudio") {
  for (const frame of document.querySelectorAll("iframe")) {
    try {
      frame.contentWindow?.postMessage({ tipo }, window.location.origin);
    } catch {
      /* ignore */
    }
  }
}

export function pausaAudioDoSite(): () => void {
  const vigentes = () =>
    [
      bgMusic,
      heartbeatLoop,
      hunterWestSound,
      p3TimeoutSound,
      glitchLoop,
      p3Sophia.el,
      ...cache.values(),
      ...looseSounds,
    ].filter((a): a is HTMLAudioElement => a !== null);

  const pausados = vigentes().filter((a) => !a.paused && !a.ended);
  for (const audio of pausados) {
    try {
      audio.pause();
    } catch {
      /* ignore */
    }
  }
  avisaIframes("pausarAudio");

  return () => {
    avisaIframes("retomarAudio");
    const ainda = new Set(vigentes());
    for (const audio of pausados) {
      if (!ainda.has(audio) || !audio.paused || audio.currentTime === 0) continue;
      void audio.play().catch(() => {});
    }
  };
}

// ── HEARTBEAT ───────────────────────────────────────────────────────────────
// Loop contínuo enquanto o usuário está dentro da tela de um Grupo.
// Instância própria, fora do `cache`, para não ser derrubada pelo stopAllAudio()
// que roda no momento da entrada.

export function startHeartbeat(volume = 0.5) {
  try {
    if (!heartbeatLoop) {
      heartbeatLoop = new Audio(soundUrl("heartbeat"));
      heartbeatLoop.loop = true;
    }
    heartbeatLoop.volume = volume;
    heartbeatLoop.currentTime = 0;
    void heartbeatLoop.play().catch(() => {
      /* autoplay bloqueado — sem batimento até o próximo gesto do usuário */
    });
  } catch {
    /* ignore */
  }
}

export function stopHeartbeat() {
  if (heartbeatLoop) {
    heartbeatLoop.pause();
    heartbeatLoop.currentTime = 0;
  }
}

// ── HUNTER WEST ─────────────────────────────────────────────────────────────
// Easter egg do Scanner de Players. O som é um arquivo próprio
// (`public/sounds/hunter-west.mp3`) — de propósito NÃO reaproveita error.mp3
// nem glitch.mp3. Para trocar o áudio, basta substituir esse arquivo na pasta;
// nenhum código precisa mudar.
//
// Instância própria (fora do `cache`) porque o ciclo do Hunter West é curto e
// precisa ser cortado na saída, junto com o glitch abrupto.

export function playHunterWest(volume = 0.5) {
  try {
    if (!hunterWestSound) {
      hunterWestSound = new Audio(soundUrl("hunterWest"));
    }
    hunterWestSound.volume = volume;
    hunterWestSound.currentTime = 0;
    void hunterWestSound.play().catch(() => {
      /* arquivo ausente ou autoplay bloqueado — o easter egg roda mudo, sem
         cair em nenhum som de erro/glitch emprestado de outro evento */
    });
  } catch {
    /* ignore */
  }
}

export function stopHunterWest() {
  if (hunterWestSound) {
    hunterWestSound.pause();
    hunterWestSound.currentTime = 0;
  }
}

// ── P3 — RELÓGIO MANIPULADO ─────────────────────────────────────────────────
// Fala do P3 na tela de bloqueio do countdown (`public/timer/`), quando alguém
// mexe no relógio do sistema. Arquivo próprio: `public/sounds/p3-timeout.mp3`.
// O countdown é uma página estática e não importa este módulo — ele tem uma
// cópia local destas duas funções (mesmo arquivo, mesmo contrato) que ainda
// liga o áudio a um AnalyserNode para a onda de voz reagir. Aqui fica o hook
// para o site, se a fala precisar tocar fora do countdown.

export function playP3Timeout(volume = 0.85) {
  try {
    if (!p3TimeoutSound) {
      p3TimeoutSound = new Audio(soundUrl("p3Timeout"));
    }
    p3TimeoutSound.volume = volume;
    p3TimeoutSound.currentTime = 0;
    void p3TimeoutSound.play().catch(() => {
      /* arquivo ainda não gravado ou autoplay bloqueado — segue mudo */
    });
  } catch {
    /* ignore */
  }
}

export function stopP3Timeout() {
  if (p3TimeoutSound) {
    p3TimeoutSound.pause();
    p3TimeoutSound.currentTime = 0;
  }
}

// ── P3 — RECONHECIMENTO ─────────────────────────────────────────────────────
// Fala da tela escondida de `components/EcoScreen.tsx` (26,78s). O arquivo
// público é CIFRADO e de nome neutro — quem baixa e decifra é a própria tela,
// que entrega aqui só a URL local (blob:) do mp3 já decifrado.
//
// Mesmo contrato da cópia de playP3Timeout() que vive no countdown: resolve
// com o AnalyserNode quando o som toca pela Web Audio (a onda reage à voz
// real), ou null se não tocar (a onda cai no modo simulado).
//
// Duas etapas, por causa do Safari, que só libera áudio no mesmo tique do
// gesto do usuário:
//   abreP3Sophia()      DENTRO do clique, síncrona: cria o <audio> e liga o
//                       AudioContext (que, criado nesse tique, já nasce
//                       rodando). O load() ali "destrava" o elemento no iOS.
//   playP3Sophia(src)   dá o play() — no mesmo tique, se o áudio já estiver
//                       decifrado; ou assim que ficar pronto, com o elemento
//                       já destravado pelo gesto.
// Se o contexto não nascer rodando, o <audio> toca direto, fora do grafo —
// com som e onda simulada, em vez de passar mudo por um contexto suspenso.
//
// Um <audio> novo a cada abertura: createMediaElementSource só aceita cada
// elemento uma vez.

const p3Sophia: {
  ctx: AudioContext | null;
  el: HTMLAudioElement | null;
  fonte: MediaElementAudioSourceNode | null;
  analyser: AnalyserNode | null;
} = { ctx: null, el: null, fonte: null, analyser: null };

export function abreP3Sophia(volume = 0.85) {
  stopP3Sophia();
  const audio = new Audio();
  audio.preload = "auto";
  audio.volume = volume;
  p3Sophia.el = audio;
  try {
    audio.load();
  } catch {
    /* ignore */
  }
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    p3Sophia.ctx ??= new AC();
    const ctx = p3Sophia.ctx;
    if (ctx.state !== "running") void ctx.resume().catch(() => {});
    // Só liga o elemento ao grafo com o contexto rodando: ligado a um
    // contexto suspenso, o som tocaria mudo.
    if (ctx.state === "running") {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      const fonte = ctx.createMediaElementSource(audio);
      fonte.connect(analyser);
      analyser.connect(ctx.destination);
      p3Sophia.fonte = fonte;
      p3Sophia.analyser = analyser;
    }
  } catch {
    /* sem Web Audio: toca mesmo assim, com a onda simulada */
  }
}

export function playP3Sophia(src: string): Promise<AnalyserNode | null> {
  const audio = p3Sophia.el;
  if (!audio) return Promise.resolve(null); // fechada antes de o áudio ficar pronto
  const falhou = () => {
    // arquivo corrompido ou áudio bloqueado — a tela segue muda
    if (p3Sophia.el === audio) stopP3Sophia();
    return null;
  };
  try {
    audio.src = src;
    return audio.play().then(() => (p3Sophia.el === audio ? p3Sophia.analyser : null), falhou);
  } catch {
    return Promise.resolve(falhou());
  }
}

/** Segundos de áudio já tocados, ou null se a fala não está tocando. */
export function p3SophiaTempo(): number | null {
  const a = p3Sophia.el;
  return a && !a.paused && a.currentTime > 0 ? a.currentTime : null;
}

export function stopP3Sophia() {
  const audio = p3Sophia.el;
  if (audio) {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
  try {
    p3Sophia.fonte?.disconnect();
  } catch {
    /* ignore */
  }
  try {
    p3Sophia.analyser?.disconnect();
  } catch {
    /* ignore */
  }
  p3Sophia.el = p3Sophia.fonte = p3Sophia.analyser = null;
}
