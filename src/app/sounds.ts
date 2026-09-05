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
