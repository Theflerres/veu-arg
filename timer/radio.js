/* ==========================================================================
   RÁDIO — sinais captados durante o countdown
   De tempos em tempos o terminal "pega" uma transmissão: chiado curto, o
   indicador SINAL ░░░ no canto, uma onda discreta enquanto o áudio toca e um
   fade no fim. Nenhum texto das mensagens existe no código — só o .mp3.

   Números e lista de sinais: timer/radio-config.js.
   Quem decide QUANDO pode tocar é o countdown (timer/index.html), pelos
   ganchos de `host`: este módulo não lê a state machine dele diretamente.

   Estado do visitante em localStorage (prefixo veu-radio-):
     veu-radio-ouvidos   ids já ouvidos, na ordem em que foram ouvidos
     veu-radio-ultimo    agora() do início do último sinal novo (cooldown)
     veu-radio-sintonia  agora() do último SINTONIZAR (cooldown do botão)
   ========================================================================== */
import {
  SINAIS, RADIO_INTERVALO_MS, RADIO_CHANCE, RADIO_COOLDOWN_MS,
  SINTONIA_CHANCE, SINTONIA_COOLDOWN_MS, RADIO_VOLUME, ESTATICA_VOLUME,
  ESTATICA_MS, RADIO_CORTE_FINAL_MS, RADIO_NO_OBS,
  FX_VOLUME_ESTATICA_SINAL, FX_VOLUME_CAMA, FX_VOLUME_SINTONIA, FX_VOLUME_PING, FX_MAX_SIMULTANEOS,
  MUSICAS, MUSICA_CHANCE, MUSICA_COOLDOWN_MS, MUSICA_VOLUME, MUSICA_CORTE_FINAL_MS,
} from './radio-config.js';

const FX = {
  emp: 'fx-emp.mp3', zumbido: 'fx-zumbido.mp3', motor: 'fx-motor.mp3',
  'sonar-ping': 'fx-sonar-ping.mp3', 'sonar-varios': 'fx-sonar-varios.mp3',
  'glitch-1': 'fx-glitch-1.mp3', 'glitch-2': 'fx-glitch-2.mp3',
  'estatica-1': 'fx-estatica-1.mp3', 'estatica-2': 'fx-estatica-2.mp3', 'estatica-3': 'fx-estatica-3.mp3',
};

const CHAVE = {
  ouvidos: 'veu-radio-ouvidos',
  ultimo: 'veu-radio-ultimo',
  sintonia: 'veu-radio-sintonia',
  musica: 'veu-radio-musica',              // agora() do início da última música
  musicaUltima: 'veu-radio-musica-ultima', // id dela (a próxima é a outra)
};

const ehMusica = (x) => !!x && MUSICAS.includes(x);

// Depois de qualquer reprodução, o sorteio automático espera este tanto antes
// de tentar de novo: sem isso um sinal novo poderia emendar num "reouvir".
const RESPIRO_MS = 30000;
// Arquivo que deu 404 só é perguntado de novo depois disto.
const RECHECA_AUSENTE_MS = 10 * 60 * 1000;
const ONDA_BARRAS = 18;

function lerJSON(chave, padrao){
  try {
    const v = JSON.parse(localStorage.getItem(chave));
    return v == null ? padrao : v;
  } catch (e){ return padrao; }
}
function grava(chave, valor){
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e){}
}
function espera(ms){ return new Promise(r => setTimeout(r, ms)); }

function urlDe(sinal){ return new URL('../sounds/' + sinal.arquivo, location.href).href; }

/* host:
     agora()          relógio confiável do countdown (ms epoch)
     horaConfiavel()  horário veio do servidor e não há tela do P3 no ar
     restanteMs()     quanto falta para o alvo do countdown
     noAr()           o rádio pode existir na tela (fora do boot, antes do
                      final, sem tela do P3). false com algo tocando = corta
     ocioso()         countdown no idle (nenhum evento/marco na tela)
     ocupado()        algo que não divide a cena com um sinal: marco no ar,
                      áudio longo do próprio timer
     pausado()        o site pausou o áudio do iframe (pausarAudio) */
export function iniciaRadio(host){
  const ui = {
    raiz: document.getElementById('radio'),
    sinal: document.getElementById('radio-sinal'),
    sinalTxt: document.getElementById('radio-sinal-txt'),
    onda: document.getElementById('radio-onda'),
    ativar: document.getElementById('radio-ativar'),
    icone: document.getElementById('radio-icone'),
    painel: document.getElementById('radio-painel'),
    lista: document.getElementById('radio-lista'),
    vazio: document.getElementById('radio-vazio'),
    sintonizar: document.getElementById('radio-sintonizar'),
    msg: document.getElementById('radio-msg'),
  };

  const r = {
    fase: 'livre',        // 'livre' | 'sintonizando' | 'aguardando' (clique) | 'tocando' | 'saindo'
    sessao: 0,            // muda a cada reprodução/corte: laço antigo para sozinho
    sinal: null,
    novo: false,          // sinal captado agora (conta como ouvido) x reouvir
    el: null,             // <audio> da vez (fora do DOM)
    ctx: null,
    analyser: null,
    dados: null,
    fonte: null,
    ganho: null,          // GainNode da vez (ganho próprio das músicas)
    ctxPausado: false,
    fimEm: -Infinity,     // performance.now() do fim da última reprodução
    proximoSorteio: performance.now() + intervalo(),
    promptMostrado: false,
    tentando: false,      // SINTONIZAR em curso
    liberaTodos: false,   // testeRadio.liberarTodos()
    barras: new Float32Array(ONDA_BARRAS),
    raf: null,
    ultTexto: '',
    msgTimer: null,
  };

  const ativo = RADIO_NO_OBS || !window.obsstudio;
  if (!ativo || !ui.raiz) return { corta(){}, ocupado: () => false, audio: () => null, pausa(){}, retoma(){} };

  function intervalo(){ return RADIO_INTERVALO_MS * (0.8 + Math.random() * 0.4); }

  /* ---------- Estado do visitante ---------- */
  function ouvidos(){
    const v = lerJSON(CHAVE.ouvidos, []);
    const ids = new Set(SINAIS.map(s => s.id));
    return Array.isArray(v) ? v.filter(id => ids.has(id)) : [];
  }
  function marcaOuvido(sinal){
    const lista = ouvidos();
    if (!lista.includes(sinal.id)) lista.push(sinal.id);
    grava(CHAVE.ouvidos, lista);
    grava(CHAVE.ultimo, host.agora());
    desenhaPainel();
  }
  // Tempo desde um carimbo gravado; carimbo no futuro (relógio torto quando
  // foi gravado) não prende ninguém.
  function emCooldown(chave, ms){
    const t = Number(lerJSON(chave, 0)) || 0;
    const dt = host.agora() - t;
    return dt >= 0 && dt < ms ? ms - dt : 0;
  }

  /* ---------- Elegibilidade ----------
     Liberado pela data (hora do servidor) E com o arquivo publicado. A
     existência é perguntada com HEAD só quando um sorteio já deu certo, e o
     resultado fica guardado: positivo para sempre, negativo por 10 min.
     No `npm run dev` o Vite devolve o index.html (200) para arquivo que não
     existe, por isso HTML também conta como ausente. */
  const existencia = new Map();

  async function existe(sinal){
    const c = existencia.get(sinal.id);
    if (c && (c.ok || performance.now() - c.em < RECHECA_AUSENTE_MS)) return c.ok;
    let ok = false;
    try {
      const resp = await fetch(urlDe(sinal), { method: 'HEAD', cache: 'no-cache' });
      ok = resp.ok && !/text\/html/i.test(resp.headers.get('Content-Type') || '');
    } catch (e){}
    existencia.set(sinal.id, { ok, em: performance.now() });
    return ok;
  }

  function liberado(sinal){
    if (r.liberaTodos) return true;
    const t = Date.parse(sinal.liberaEm);
    return host.horaConfiavel() && Number.isFinite(t) && host.agora() >= t;
  }

  async function escolhe(){
    const ja = new Set(ouvidos());
    const pool = SINAIS.filter(s => !ja.has(s.id) && liberado(s));
    if (!pool.length) return null;
    const presentes = (await Promise.all(pool.map(s => existe(s).then(ok => (ok ? s : null)))))
      .filter(Boolean);
    return presentes.length ? presentes[Math.floor(Math.random() * presentes.length)] : null;
  }

  // Pode COMEÇAR um sinal agora (automático, SINTONIZAR ou reouvir)?
  function podeComecar(){
    return host.noAr() && !host.pausado() && !host.ocupado() &&
      host.restanteMs() > RADIO_CORTE_FINAL_MS;
  }

  /* ---------- Som: contexto, chiado e analyser ----------
     Um AudioContext só, com o analyser ligado no destino: o chiado e o .mp3
     passam por ele, e a onda desenha os dois. O .mp3 só é ligado ao grafo com
     o contexto rodando — ligado a um contexto suspenso, tocaria mudo. */
  function criaContexto(){
    if (r.ctx) return r.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      r.ctx = new AC();
      r.analyser = r.ctx.createAnalyser();
      r.analyser.fftSize = 128;
      r.analyser.smoothingTimeConstant = 0.78;
      r.analyser.connect(r.ctx.destination);
      r.dados = new Uint8Array(r.analyser.frequencyBinCount);
    } catch (e){ r.ctx = null; }
    return r.ctx;
  }

  async function somLiberado(){
    const ctx = criaContexto();
    if (!ctx) return false;
    try {
      // sem gesto do usuário o resume() pode ficar pendente para sempre
      if (ctx.state !== 'running') await Promise.race([ctx.resume(), espera(300)]);
    } catch (e){}
    return ctx.state === 'running';
  }

  // Chamado direto dentro de um clique: é o que destrava o som no navegador.
  function destravaNoClique(){
    const ctx = criaContexto();
    try { if (ctx && ctx.state !== 'running') ctx.resume(); } catch (e){}
  }

  // Ruído branco com estalos, num passa-faixa que varre como um dial girando.
  function estatica(ms, volume){
    const ctx = r.ctx;
    if (!ctx || ctx.state !== 'running' || ms <= 0) return;
    try {
      const n = Math.max(1, Math.floor(ctx.sampleRate * ms / 1000));
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let estalo = 0;
      for (let i = 0; i < n; i++){
        if (Math.random() < 0.0006) estalo = 0.5 + Math.random() * 0.9;
        estalo *= 0.9993;
        d[i] = (Math.random() * 2 - 1) * (0.32 + estalo);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'bandpass';
      filtro.Q.value = 0.9;
      const g = ctx.createGain();
      const t0 = ctx.currentTime, t1 = t0 + ms / 1000;
      const ataque = Math.min(0.08, (t1 - t0) / 4);
      filtro.frequency.setValueAtTime(700 + Math.random() * 700, t0);
      filtro.frequency.exponentialRampToValueAtTime(2000 + Math.random() * 1600, t1);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(volume, t0 + ataque);
      g.gain.setValueAtTime(volume, Math.max(t0 + ataque, t1 - 0.22));
      g.gain.exponentialRampToValueAtTime(0.0001, t1);
      src.connect(filtro);
      filtro.connect(g);
      g.connect(r.analyser);
      src.start(t0);
      src.stop(t1 + 0.05);
    } catch (e){}
  }

  function ligaNoGrafo(audio){
    if (r.fonte || !r.ctx || r.ctx.state !== 'running' || r.el !== audio) return;
    try {
      r.fonte = r.ctx.createMediaElementSource(audio);
      // ganho próprio da música (os arquivos são mais baixos que os sinais)
      r.ganho = r.ctx.createGain();
      r.ganho.gain.value = ehMusica(r.sinal) ? Math.pow(10, (r.sinal.ganhoDb || 0) / 20) : 1;
      r.fonte.connect(r.ganho);
      r.ganho.connect(r.analyser);
    } catch (e){ r.fonte = null; r.ganho = null; }
  }

  /* ---------- Efeitos de arquivo (public/sounds/fx/) ----------
     Mesmo contrato do sounds.ts do site, em versão local (esta página não
     importa o módulo do site): instância própria por toque, no máximo
     FX_MAX_SIMULTANEOS (o mais antigo sai), fade por rampa de volume que
     congela enquanto o site pausa o áudio. tocaFx resolve true se tocou,
     false se o arquivo falta ou o som foi barrado. */
  const fxVivos = new Map();   // nome → { el, inicio, rampa, acaba, pausadoPorFora }

  function fxUrl(nome){ return new URL('../sounds/fx/' + FX[nome], location.href).href; }

  function tocaFx(nome, volume, loop = false){
    paraFx(nome);
    const outros = [...fxVivos.entries()].sort((a, b) => a[1].inicio - b[1].inicio);
    while (outros.length >= FX_MAX_SIMULTANEOS) paraFx(outros.shift()[0]);
    let el;
    try { el = new Audio(fxUrl(nome)); } catch (e){ return Promise.resolve(false); }
    el.volume = volume;
    el.loop = loop;
    let feito = false;
    const vivo = {
      el, inicio: performance.now(), rampa: null, pausadoPorFora: false,
      acaba(){
        if (feito) return;
        feito = true;
        clearInterval(vivo.rampa);
        if (fxVivos.get(nome) === vivo) fxVivos.delete(nome);
      },
    };
    fxVivos.set(nome, vivo);
    el.addEventListener('ended', vivo.acaba, { once: true });
    el.addEventListener('error', vivo.acaba, { once: true });
    return el.play().then(() => true, () => { vivo.acaba(); return false; });
  }

  function paraFx(nome, fadeMs = 0){
    const vivo = fxVivos.get(nome);
    if (!vivo) return;
    if (fadeMs <= 0){
      try { vivo.el.pause(); } catch (e){}
      vivo.acaba();
      return;
    }
    clearInterval(vivo.rampa);
    const de = vivo.el.volume;
    let passado = 0, ult = performance.now();
    vivo.rampa = setInterval(() => {
      const t = performance.now();
      if (!host.pausado()) passado += t - ult;
      ult = t;
      const q = Math.min(1, passado / fadeMs);
      try { vivo.el.volume = de * (1 - q); } catch (e){}
      if (q < 1) return;
      try { vivo.el.pause(); } catch (e){}
      vivo.acaba();
    }, 50);
  }

  function paraTodosFx(){ for (const nome of [...fxVivos.keys()]) paraFx(nome); }

  /* Chiado antes do sinal: fx-estatica-1; sem o arquivo, o chiado gerado.
     Sem som nenhum (autoplay barrado), não espera: o toca() pede o clique. */
  async function chiadoAntes(ms, sessao){
    paraFx('estatica-3');
    const tocou = await tocaFx('estatica-1', FX_VOLUME_ESTATICA_SINAL);
    if (sessao !== r.sessao){ paraFx('estatica-1'); return false; }
    if (!tocou){
      if (!(await somLiberado())) return true;
      estatica(ms, ESTATICA_VOLUME);
    }
    return aguarda(ms, sessao);
  }

  /* Espera que só anda com o som do site liberado: pausado no meio do
     chiado, o sinal não começa por baixo da pausa. false = foi cortado. */
  function aguarda(ms, sessao){
    return new Promise(resolve => {
      let resta = ms, ult = performance.now();
      const passo = () => {
        if (sessao !== r.sessao) return resolve(false);
        const t = performance.now();
        if (!host.pausado()) resta -= t - ult;
        ult = t;
        if (resta <= 0) return resolve(true);
        setTimeout(passo, Math.min(100, Math.max(16, resta)));
      };
      setTimeout(passo, Math.min(100, Math.max(16, ms)));
    });
  }

  /* ---------- Reprodução ---------- */
  async function capta(sinal, novo){
    const sessao = ++r.sessao;
    r.fase = 'sintonizando';
    r.sinal = sinal;
    r.novo = novo;
    r.fonte = null;
    const audio = new Audio(urlDe(sinal));
    audio.preload = 'auto';
    audio.volume = ehMusica(sinal) ? MUSICA_VOLUME : RADIO_VOLUME;
    r.el = audio;
    audio.addEventListener('ended', () => termina(sessao));
    audio.addEventListener('error', () => {
      if (import.meta.env.DEV) console.warn('[radio] não deu para tocar', sinal.arquivo);
      if (sessao === r.sessao) corta();
    });
    mostraIndicador();
    desenhaPainel();

    if (novo) void tocaFx('sonar-ping', FX_VOLUME_PING);   // sinal novo captado
    await somLiberado();                                   // contexto da onda
    if (sessao !== r.sessao) return;
    // estática primeiro (cheia para sinal novo e música; metade para reouvir), depois o áudio
    if (!(await chiadoAntes(novo || ehMusica(sinal) ? ESTATICA_MS : ESTATICA_MS / 2, sessao))) return;
    if (sessao !== r.sessao) return;
    toca(sessao);
  }

  async function toca(sessao){
    const audio = r.el;
    if (!audio) return;
    ligaNoGrafo(audio);
    try {
      await audio.play();
    } catch (e){
      if (sessao !== r.sessao) return;
      // Autoplay barrado: pede o clique uma vez só por carga da página. Na
      // segunda vez o sinal só não acontece (e não conta como ouvido).
      if (e && e.name === 'NotAllowedError' && !r.promptMostrado){
        r.promptMostrado = true;
        r.fase = 'aguardando';
        ui.ativar.hidden = false;
        return;
      }
      corta();
      return;
    }
    if (sessao !== r.sessao){ try { audio.pause(); } catch (e){} return; }
    r.fase = 'tocando';
    ui.sinal.classList.add('tocando');
    paraFx('estatica-1', 500);
    if (ehMusica(r.sinal)){
      grava(CHAVE.musica, host.agora());
      grava(CHAVE.musicaUltima, r.sinal.id);
    } else {
      void tocaFx('estatica-2', FX_VOLUME_CAMA, true);       // cama sob a voz
    }
    if (r.novo) marcaOuvido(r.sinal);
    desenhaPainel();
  }

  ui.ativar.addEventListener('click', () => {
    ui.ativar.hidden = true;
    const audio = r.el, sessao = r.sessao;
    if (r.fase !== 'aguardando' || !audio) return;
    r.fase = 'sintonizando';
    destravaNoClique();
    // play() mudo dentro do clique destrava o elemento (Safari exige o gesto
    // no próprio play); depois volta ao zero e segue o fluxo normal.
    audio.muted = true;
    audio.play()
      .then(() => { audio.pause(); audio.currentTime = 0; }, () => {})
      .then(async () => {
        audio.muted = false;
        if (sessao !== r.sessao) return;
        await somLiberado();
        if (sessao !== r.sessao) return;
        if (!(await chiadoAntes(ESTATICA_MS, sessao))) return;
        if (sessao === r.sessao) toca(sessao);
      });
  });

  // Fim natural: um resto de chiado e o indicador sai em fade.
  function termina(sessao){
    if (sessao !== r.sessao) return;
    estatica(380, ESTATICA_VOLUME * 0.7);
    encerra();
  }

  // Corte (tela do P3, sequência final, erro, PARAR): para na hora.
  function corta(){
    if (r.fase === 'livre') return;
    r.sessao++;
    encerra();
  }

  function encerra(){
    const audio = r.el;
    if (audio){ try { audio.pause(); } catch (e){} }
    try { if (r.fonte) r.fonte.disconnect(); } catch (e){}
    try { if (r.ganho) r.ganho.disconnect(); } catch (e){}
    r.fonte = null;
    r.ganho = null;
    r.el = null;
    r.sinal = null;
    r.fimEm = performance.now();
    paraFx('estatica-1', 200);
    paraFx('estatica-2', 400);
    paraFx('estatica-3', 400);
    ui.ativar.hidden = true;
    ui.sinal.classList.remove('ativo', 'tocando');
    // o canvas segue desenhando até o fade do CSS terminar
    r.fase = 'saindo';
    const sessao = r.sessao;
    setTimeout(() => {
      if (sessao !== r.sessao || r.fase !== 'saindo') return;
      r.fase = 'livre';
      desenhaPainel();
    }, 900);
    desenhaPainel();
  }

  /* ---------- Indicador e onda ---------- */
  function mostraIndicador(){
    ui.sinal.classList.add('ativo');
    ui.sinal.classList.remove('tocando');
    if (r.raf === null) r.raf = requestAnimationFrame(quadro);
  }

  function quadro(){
    const cv = ui.onda;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)){
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const comAnalyser = r.ctx && r.ctx.state === 'running';
    if (comAnalyser) r.analyser.getByteFrequencyData(r.dados);
    const t = performance.now() / 1000;
    let soma = 0;
    for (let i = 0; i < ONDA_BARRAS; i++){
      let alvo;
      if (comAnalyser){
        alvo = Math.pow(r.dados[1 + Math.floor(i * (r.dados.length - 2) / ONDA_BARRAS)] / 255, 1.4);
      } else {
        // sem Web Audio: só um tremor, mais vivo enquanto o sinal toca
        const vivo = r.fase === 'tocando' && r.el && !r.el.paused ? 0.55 : 0.12;
        alvo = vivo * (0.4 + 0.6 * Math.random()) * (0.6 + 0.4 * Math.sin(t * 7 + i));
      }
      alvo = Math.max(0.06, alvo);
      const b = r.barras[i];
      r.barras[i] = b + (alvo - b) * (alvo > b ? 0.45 : 0.14);
      soma += r.barras[i];
    }
    const passo = w / ONDA_BARRAS;
    const larg = Math.max(1, passo * 0.5);
    g.fillStyle = '#33ff66';
    for (let i = 0; i < ONDA_BARRAS; i++){
      const alt = Math.max(1, Math.min(1, r.barras[i]) * h);
      g.fillRect(i * passo + (passo - larg) / 2, (h - alt) / 2, larg, alt);
    }

    // SINAL ░░░: varre enquanto sintoniza; tocando, mostra a força do sinal.
    let n;
    if (r.fase === 'tocando') n = Math.max(1, Math.min(3, Math.round((soma / ONDA_BARRAS) * 7)));
    else if (r.fase === 'saindo') n = 0;
    else n = Math.floor(t * 5) % 4;
    const texto = 'SINAL ' + '▓'.repeat(n) + '░'.repeat(3 - n);
    if (texto !== r.ultTexto){ ui.sinalTxt.textContent = texto; r.ultTexto = texto; }

    if (r.fase === 'livre'){ r.raf = null; r.barras.fill(0); return; }
    r.raf = requestAnimationFrame(quadro);
  }

  /* ---------- Painel ---------- */
  function desenhaPainel(){
    const lista = ouvidos();
    const livre = r.fase === 'livre';
    const itens = lista.map((id, i) => {
      const li = document.createElement('li');
      const rot = document.createElement('span');
      rot.textContent = 'SINAL ' + (i + 1);
      const bt = document.createElement('button');
      bt.type = 'button';
      const esteTocando = !livre && r.sinal && r.sinal.id === id;
      bt.textContent = esteTocando ? 'PARAR' : 'REOUVIR';
      bt.disabled = !livre && !esteTocando;
      bt.addEventListener('click', () => (esteTocando ? corta() : reouvir(id)));
      li.append(rot, bt);
      return li;
    });
    // música no ar: uma linha só para poder parar (some quando ela acaba)
    if (!livre && r.fase !== 'saindo' && ehMusica(r.sinal)){
      const li = document.createElement('li');
      const rot = document.createElement('span');
      rot.textContent = 'TRANSMISSÃO';
      const bt = document.createElement('button');
      bt.type = 'button';
      bt.textContent = 'PARAR';
      bt.addEventListener('click', () => corta());
      li.append(rot, bt);
      itens.unshift(li);
    }
    ui.lista.replaceChildren(...itens);
    ui.vazio.hidden = itens.length > 0;
    atualizaSintonizar();
  }

  function atualizaSintonizar(){
    const resta = emCooldown(CHAVE.sintonia, SINTONIA_COOLDOWN_MS);
    const ocupado = r.fase !== 'livre' || r.tentando;
    ui.sintonizar.disabled = ocupado || resta > 0;
    ui.sintonizar.textContent = r.tentando ? 'SINTONIZANDO…'
      : resta > 0 ? 'SINTONIZAR · ' + Math.ceil(resta / 1000) + 's' : 'SINTONIZAR';
  }

  function mensagem(texto){
    clearTimeout(r.msgTimer);
    ui.msg.textContent = texto;
    r.msgTimer = setTimeout(() => { ui.msg.textContent = ''; }, 4000);
  }

  function abrePainel(abrir){
    ui.painel.hidden = !abrir;
    ui.icone.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    if (abrir) desenhaPainel();
  }

  ui.icone.addEventListener('click', (e) => {
    e.stopPropagation();
    abrePainel(ui.painel.hidden);
  });
  ui.painel.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => { if (!ui.painel.hidden) abrePainel(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !ui.painel.hidden) abrePainel(false); });

  function reouvir(id){
    const sinal = SINAIS.find(s => s.id === id);
    if (!sinal || r.fase !== 'livre') return;
    destravaNoClique();
    if (!podeComecar()){ mensagem('— canal ocupado —'); return; }
    capta(sinal, false);
  }

  /* SINTONIZAR: tentativa manual, mesma regra do sorteio (elegível e ainda
     não ouvido, cooldown entre sinais novos), com chance e cooldown próprios.
     Falhar e "não ter mais nada" dão a mesma resposta: o painel não conta
     quantos sinais existem. */
  ui.sintonizar.addEventListener('click', async () => {
    if (r.fase !== 'livre' || r.tentando || emCooldown(CHAVE.sintonia, SINTONIA_COOLDOWN_MS)) return;
    destravaNoClique();
    if (!podeComecar()){ mensagem('— canal ocupado —'); return; }
    grava(CHAVE.sintonia, host.agora());
    const dial = tocaFx('estatica-3', FX_VOLUME_SINTONIA);   // dentro do clique
    r.tentando = true;
    atualizaSintonizar();

    let sinal = null;
    if (!emCooldown(CHAVE.ultimo, RADIO_COOLDOWN_MS) && Math.random() < SINTONIA_CHANCE) sinal = await escolhe();
    r.tentando = false;
    if (sinal && r.fase === 'livre' && podeComecar()){ capta(sinal, true); return; }

    // nada: o dial chia um pouco e volta ao silêncio
    const sessao = ++r.sessao;
    r.fase = 'sintonizando';
    mostraIndicador();
    desenhaPainel();
    if (!(await dial) && await somLiberado()) estatica(1000, ESTATICA_VOLUME);
    if (!(await aguarda(1000, sessao))) return;
    encerra();
    mensagem('— sem sinal —');
  });

  /* ---------- Vigia (1 s) ----------
     Mostra/esconde o ícone, corta o que estiver tocando quando o rádio sai do
     ar (tela do P3, sequência final) e, na hora, faz o sorteio automático.
     Tentativa que vence com a cena ocupada (evento, marco, aba escondida) não
     se perde: espera o primeiro segundo livre. Senão um terço delas cairia em
     cima de um painel de lore e a chance real ficaria bem abaixo da do config. */
  function cenaLivre(){
    return r.fase === 'livre' && document.visibilityState === 'visible' &&
      host.ocioso() && podeComecar() && performance.now() - r.fimEm >= RESPIRO_MS;
  }

  async function sorteioAutomatico(){
    if (await tentaSinal()) return;
    await tentaMusica();
  }

  async function tentaSinal(){
    if (emCooldown(CHAVE.ultimo, RADIO_COOLDOWN_MS)) return false;
    const ja = new Set(ouvidos());
    if (SINAIS.every(s => ja.has(s.id))) return false;   // ouviu tudo: só o painel
    if (Math.random() >= RADIO_CHANCE) return false;
    const sinal = await escolhe();
    // a espera do HEAD pode ter mudado a cena
    if (!sinal || !cenaLivre()) return false;
    capta(sinal, true);
    return true;
  }

  /* Música: chance e cooldown próprios; alterna entre as duas (a última
     tocada fica para depois). Arquivo ausente = ignorado, como nos sinais. */
  async function tentaMusica(){
    if (!MUSICAS.length || emCooldown(CHAVE.musica, MUSICA_COOLDOWN_MS)) return false;
    if (host.restanteMs() <= MUSICA_CORTE_FINAL_MS) return false;
    if (Math.random() >= MUSICA_CHANCE) return false;
    const musica = await escolheMusica();
    if (!musica || !cenaLivre()) return false;
    capta(musica, false);
    return true;
  }

  async function escolheMusica(){
    const ultima = lerJSON(CHAVE.musicaUltima, null);
    const presentes = (await Promise.all(MUSICAS.map(m => existe(m).then(ok => (ok ? m : null))))).filter(Boolean);
    if (!presentes.length) return null;
    const outras = presentes.filter(m => m.id !== ultima);
    const pool = outras.length ? outras : presentes;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Ícone e painel só existem com o rádio no ar.
  function confereNoAr(){
    const noAr = host.noAr();
    if (ui.raiz.hidden === noAr){
      ui.raiz.hidden = !noAr;
      if (!noAr) abrePainel(false);
    }
    return noAr;
  }

  function vigia(){
    const noAr = confereNoAr();
    if (!noAr){ if (r.fase !== 'livre' && r.fase !== 'saindo') corta(); return; }
    if (!ui.painel.hidden) atualizaSintonizar();
    if (performance.now() < r.proximoSorteio || !cenaLivre()) return;
    r.proximoSorteio = performance.now() + intervalo();
    sorteioAutomatico();
  }
  setInterval(vigia, 1000);

  /* ---------- Atalhos de teste — só em `npm run dev` ----------
     testeRadio.tocar(n)      toca o sinal n (1 = primeiro de SINAIS) agora,
                              sem data, chance nem cooldown; conta como ouvido
     testeRadio.liberarTodos() ignora as datas de liberaEm (fica gravado até
                              o zerar)
     testeRadio.zerar()       apaga todas as chaves veu-radio-* */
  if (import.meta.env.DEV){
    try { r.liberaTodos = localStorage.getItem('veu-radio-libera-teste') === '1'; } catch (e){}
    window.testeRadio = {
      tocar(n){
        const sinal = SINAIS[n - 1];
        if (!sinal){ console.warn('[radio] testeRadio.tocar: use 1 a ' + SINAIS.length); return; }
        if (!host.noAr()){ console.warn('[radio] testeRadio.tocar: o rádio não está no ar (boot, tela do P3 ou final)'); return; }
        corta();
        capta(sinal, true);
      },
      musica(n){
        const m = MUSICAS[n - 1];
        if (!m){ console.warn('[radio] testeRadio.musica: use 1 a ' + MUSICAS.length); return; }
        if (!host.noAr()){ console.warn('[radio] testeRadio.musica: o rádio não está no ar (boot, tela do P3 ou final)'); return; }
        corta();
        capta(m, false);
      },
      liberarTodos(){
        r.liberaTodos = true;
        try { localStorage.setItem('veu-radio-libera-teste', '1'); } catch (e){}
        console.log('[radio] testeRadio: datas ignoradas (zerar() desfaz)');
      },
      zerar(){
        corta();
        paraTodosFx();
        r.liberaTodos = false;
        r.promptMostrado = false;
        r.fimEm = -Infinity;
        existencia.clear();
        try {
          Object.keys(localStorage).filter(k => k.startsWith('veu-radio-')).forEach(k => localStorage.removeItem(k));
        } catch (e){}
        desenhaPainel();
        console.log('[radio] testeRadio: estado apagado');
      },
    };
    console.log('[radio] testeRadio: tocar(n) · liberarTodos() · zerar()');
    // efeitos de public/sounds/fx/ — mesmo nome do atalho do site
    window.testeFx = {
      tocar(nome){
        if (!FX[nome]){ console.warn('[fx] testeFx.tocar: use ' + Object.keys(FX).join(', ')); return; }
        void tocaFx(nome, 0.5, nome === 'motor' || nome === 'sonar-varios' || nome === 'estatica-2');
      },
      parar: paraTodosFx,
    };
    console.log('[fx] testeFx: tocar(nome) · parar()');
  }

  desenhaPainel();

  return {
    // tela do P3 / sequência final: corta e já tira o ícone, sem esperar o vigia
    corta(){ corta(); confereNoAr(); },
    // chiando ou tocando: o marco espera (o aviso de clique não segura nada)
    // música não segura o marco: os dois podem dividir a tela
    ocupado: () => (r.fase === 'sintonizando' || r.fase === 'tocando') && !ehMusica(r.sinal),
    audio: () => r.el,
    // pausarAudio/retomarAudio do site: o <audio> é pausado pelo listener do
    // countdown; aqui só congela o chiado em curso
    pausa(){
      if (r.ctx && r.ctx.state === 'running'){
        r.ctxPausado = true;
        try { r.ctx.suspend(); } catch (e){}
      }
      for (const v of fxVivos.values()){
        if (!v.el.paused){ v.pausadoPorFora = true; try { v.el.pause(); } catch (e){} }
      }
    },
    retoma(){
      for (const v of fxVivos.values()){
        if (v.pausadoPorFora){ v.pausadoPorFora = false; v.el.play().catch(() => {}); }
      }
      if (!r.ctxPausado) return;
      r.ctxPausado = false;
      try { r.ctx.resume(); } catch (e){}
    },
  };
}
