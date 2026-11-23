// Login: logo em camadas, onda, "MIAU" e a ficha de acesso. A animação toda é
// função de t (s). Na abertura ela roda muda (sem selo); no OBSERVAR com a
// chave certa, recomeça das orelhas, toca o miau e o selo cai para OBSERVADO.
// A onda, o texto, o tremor das orelhas e o brilho dos óculos seguem o
// envelope do arquivo — com som ou no mudo. prefers-reduced-motion: sem
// movimento, só os estados.

import { useEffect, useRef, useState } from "react";
import { LOGO_CAMADAS as L } from "../assets/logo-camadas";
import { CHAVE_LOGIN, TEXTOS } from "../config";
import { carregaEnvelope, destravaNoGesto, envelopeAtual, preparaAudio, tocaMiau, type Envelope } from "../miau";
import { BotaoMudo } from "./comum";
import { Trava } from "./Trava";

const ATRASO_SOM = 0.5;
const AZ2 = [0x68, 0x8e, 0xbe], AZ = [0x1a, 0x52, 0xa0], ACESO = [0x2f, 0x86, 0xff];
const GLIFOS = "0123456789ABCDEF█▓▒░";
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const fase = (t: number, iv: [number, number]) => clamp((t - iv[0]) / (iv[1] - iv[0]), 0, 1);
const suave = (u: number) => u * u * (3 - 2 * u);
const mix = (a: number[], b: number[], u: number) => a.map((v, i) => Math.round(v + (b[i] - v) * u));
const hex = (c: number[]) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
const hash = (a: number, b: number) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return Math.abs(h ^ (h >>> 16)); };

export function Login({ onEntrar }: { onEntrar: () => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const onda = useRef<SVGPathElement>(null);
  const miau = useRef<HTMLDivElement>(null);
  const carimbo = useRef<HTMLSpanElement>(null);
  const motor = useRef<{ observar: () => void } | null>(null);
  const [obs, setObs] = useState(false);

  useEffect(() => {
    const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = svg.current!;
    el.setAttribute("viewBox", `0 0 ${L.w} ${L.h}`);
    el.innerHTML =
      `<defs><path id="schSil" d="${L.silhueta}"/>` +
      `<clipPath id="schBase"><rect x="0" y="${L.corteOrelhas - 0.5}" width="${L.w}" height="${L.h}"/></clipPath>` +
      `<clipPath id="schE"><rect x="0" y="0" width="${L.meio}" height="${L.corteOrelhas + 1}"/></clipPath>` +
      `<clipPath id="schD"><rect x="${L.meio}" y="0" width="${L.w - L.meio}" height="${L.corteOrelhas + 1}"/></clipPath></defs>` +
      `<g data-p="tudo" fill="#DCE8F5" fill-rule="evenodd">` +
      `<use href="#schSil" clip-path="url(#schBase)"/>` +
      `<g data-p="orE"><use href="#schSil" clip-path="url(#schE)"/></g>` +
      `<g data-p="orD"><use href="#schSil" clip-path="url(#schD)"/></g>` +
      `<path fill="#FFFFFF" d="${L.lentes}"/><path data-p="ocu" d="${L.oculos}"/>` +
      `<g data-p="olhosG"><path data-p="olh" d="${L.olhos}"/></g></g>`;
    const q = (n: string) => el.querySelector(`[data-p="${n}"]`) as SVGGraphicsElement;
    const tudo = q("tudo"), orE = q("orE"), orD = q("orD"), ocu = q("ocu"), olh = q("olh"), olhosG = q("olhosG");

    let ENV: Envelope | null = envelopeAtual();
    const T = { entra: [0, 0.4] as [number, number], orelhas: [0.4, 0.9] as [number, number], oculos: [0.7, 1] as [number, number], pisca: [1, 1.18] as [number, number], miau: 0.9 };
    const dur = () => (ENV ? ENV.duracao : 0.8);
    const selo = () => { const a = Math.max(2.15, T.miau + dur() + 0.1); return [a, a + 0.35] as [number, number]; };
    let acum: number[] | null = null;
    const preparaAcum = () => {
      if (!ENV) return;
      let s = 0; const a = ENV.env.map((v) => (s += v * v));
      acum = a.map((v) => v / (s || 1));
    };
    preparaAcum();
    const ler = (arr: number[], u: number, fim: number) => {
      const p = u * ENV!.fps, i = Math.floor(p), f = p - i;
      if (i < 0) return 0;
      if (i >= arr.length) return fim;
      return arr[i] * (1 - f) + (i + 1 < arr.length ? arr[i + 1] : fim) * f;
    };
    const env = (t: number) => { const u = t - T.miau; if (u < 0 || u > dur()) return 0; return ENV ? ler(ENV.env, u, 0) : Math.exp((-4 * u) / dur()) * Math.min(1, u * 30); };
    const energia = (t: number) => { const u = t - T.miau; if (u <= 0) return 0; return acum ? ler(acum, u, 1) : clamp(u / (dur() * 0.6), 0, 1); };

    function desenha(t: number, comSelo: boolean) {
      const e = env(t), tocando = t >= T.miau && t <= T.miau + dur();
      const en = suave(fase(t, T.entra));
      tudo.style.opacity = String(reduz ? (en > 0 ? 1 : 0) : en);
      tudo.setAttribute("transform", reduz ? "" : `translate(0,${((1 - en) * 18).toFixed(2)})`);
      let th = 0;
      if (!reduz) {
        const u = fase(t, T.orelhas);
        if (u > 0 && u < 1) th += 2 * Math.sin(2 * Math.PI * 2.5 * u) * Math.pow(1 - u, 0.7);
        if (tocando) th += 4 * Math.pow(e, 1.3) * Math.sin(2 * Math.PI * 13 * (t - T.miau));
      }
      const sk = (g: Element, a: number) => g.setAttribute("transform", `translate(0,${L.corteOrelhas}) skewX(${a.toFixed(3)}) translate(0,${-L.corteOrelhas})`);
      sk(orE, th); sk(orD, -th);
      let c = mix(AZ2, AZ, reduz ? (t >= T.oculos[0] ? 1 : 0) : suave(fase(t, T.oculos)));
      const brilho = reduz ? (tocando ? 0.6 : 0) : suave(clamp((e - 0.2) / 0.7, 0, 1));
      c = mix(c, ACESO, brilho);
      ocu.setAttribute("fill", hex(c)); olh.setAttribute("fill", hex(c));
      ocu.style.filter = brilho > 0.02 ? `drop-shadow(0 0 ${(brilho * 6).toFixed(1)}px rgba(47,134,255,${(brilho * 0.75).toFixed(2)}))` : "";
      const p = fase(t, T.pisca); let sy = 1;
      if (!reduz && p > 0 && p < 1) sy = 1 - 0.92 * (1 - Math.abs(2 * p - 1));
      olhosG.setAttribute("transform", `translate(${L.olhosCentro.cx},${L.olhosCentro.cy}) scale(1,${sy.toFixed(3)}) translate(${-L.olhosCentro.cx},${-L.olhosCentro.cy})`);
      const x1 = reduz ? (t >= T.miau ? 1 : 0) : clamp((t - T.miau) / dur(), 0, 1);
      let d = "";
      for (let i = 0, N = 150; i <= N * x1; i++) {
        const x = i / N, a = Math.sqrt(env(T.miau + x * dur()));
        d += `${i ? "L" : "M"}${(x * 300).toFixed(1)} ${(17 - a * 15 * Math.sin(i * 1.15)).toFixed(2)}`;
      }
      onda.current?.setAttribute("d", d);
      let html = "";
      if (t >= T.miau) {
        const g = energia(t);
        for (let k = 0; k < 4; k++) {
          if (reduz || g >= (k + 1) / 5) html += "MIAU"[k];
          else html += `<span class="g">${GLIFOS[hash(e > 0.08 ? Math.floor(t * 30) : 0, k) % GLIFOS.length]}</span>`;
        }
      }
      if (miau.current && miau.current.innerHTML !== html) miau.current.innerHTML = html;
      const s = comSelo ? fase(t, selo()) : 0;
      if (carimbo.current) {
        carimbo.current.classList.toggle("obs", s > 0);
        carimbo.current.textContent = s > 0 ? "Observado" : "Não observado";
        if (s > 0 && !reduz) { const k = suave(s); carimbo.current.style.transform = `translateY(${((1 - k) * -26).toFixed(1)}px) rotate(${(-9 + 5 * k).toFixed(2)}deg) scale(${(1.25 - 0.25 * k).toFixed(3)})`; }
        else carimbo.current.style.transform = "";
      }
      return s > 0;
    }

    // relógio: o do <audio> enquanto toca; senão, o do navegador
    let rel = { inicio: performance.now(), base: 0, ate: T.miau + dur() + 0.05, selo: false, audio: null as HTMLAudioElement | null, ultimo: 0 };
    let raf = 0, vivo = true, viuSelo = false;
    const agoraT = () => {
      const a = rel.audio;
      const t = a && !a.paused && !a.ended && a.currentTime > 0 ? T.miau + a.currentTime : rel.base + (performance.now() - rel.inicio) / 1000;
      return (rel.ultimo = Math.max(rel.ultimo, t));
    };
    const quadro = () => {
      if (!vivo) return;
      const t = Math.min(agoraT(), rel.ate);
      const s = desenha(t, rel.selo);
      if (s && !viuSelo) { viuSelo = true; setObs(true); }
      if (t < rel.ate) raf = requestAnimationFrame(quadro);
      else if (rel.selo) window.setTimeout(() => vivo && onEntrar(), 700);
    };
    raf = requestAnimationFrame(quadro);

    preparaAudio();
    void carregaEnvelope().then((e) => { if (e && !ENV) { ENV = e; preparaAcum(); } });

    motor.current = {
      observar() {
        cancelAnimationFrame(raf);
        rel = { inicio: performance.now(), base: T.miau - ATRASO_SOM, ate: selo()[1] + 0.05, selo: true, audio: null, ultimo: 0 };
        const meu = rel;
        window.setTimeout(() => { if (rel === meu) meu.audio = tocaMiau(); }, ATRASO_SOM * 1000);
        raf = requestAnimationFrame(quadro);
      },
    };
    return () => { vivo = false; cancelAnimationFrame(raf); };
  }, [onEntrar]);

  return (
    <div className="login">
      <div className="topo">
        {TEXTOS.no ? <span>Nó {TEXTOS.no}</span> : <span />}
        <span className="dir">
          <span className="estado-sessao">{obs ? "Sessão iniciada" : "Sessão não iniciada"}</span>
          <BotaoMudo />
        </span>
      </div>
      <main className="centro">
        <div className="caixa-logo" aria-hidden="true"><svg ref={svg} role="presentation" /><i className="c3" /><i className="c4" /></div>
        <svg className="onda" viewBox="0 0 300 34" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="17" x2="300" y2="17" /><path ref={onda} d="" /></svg>
        <div className="miau" ref={miau} aria-hidden="true" />
        <h1 className="t-sistema">Sistema Schrödinger</h1>
        {TEXTOS.subtitulo && <div className="sub">{TEXTOS.subtitulo}</div>}
        <section className="ficha ficha-acesso" aria-label="Ficha de acesso">
          <header><span className="t-rotulo">Ficha de acesso</span><span className="t-mini">Nº 0001</span></header>
          <Trava
            hash={CHAVE_LOGIN}
            numero="01"
            rotulo="Chave de acesso"
            botao="Observar"
            autoFocus
            ajuda="A caixa só abre quando alguém observa."
            onGesto={destravaNoGesto}
            onAceita={() => motor.current?.observar()}
            bloqueado={obs}
          />
          <div className="bloco">
            <span className="t-rotulo"><span className="num">02</span>Estado do gato</span>
            <div className="gato" role="status" aria-live="polite">
              <span className="g-rot">ESTADO</span>
              <span className="g-cel sup">VIVO</span>
              <span className="g-cel sup">MORTO</span>
              <span className={`g-cel ${obs ? "obs" : "ativo"}`}><span className="pulso" />{obs ? "OBSERVADO" : "NÃO OBSERVADO"}</span>
            </div>
          </div>
          <span className="carimbo" ref={carimbo} aria-hidden="true">Não observado</span>
        </section>
      </main>
      <footer className="rodape">
        <span>Titular: {TEXTOS.titular}</span>
        <span>Conexão redirecionada{TEXTOS.origem ? ` · ${TEXTOS.origem}` : ""}</span>
      </footer>
    </div>
  );
}
