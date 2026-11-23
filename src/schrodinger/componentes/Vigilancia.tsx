// Vigilância orbital — a rede de satélites se reconectando depois de muito
// tempo desligada. Ciclo de 12 s:
//   • SAT-01 está online; SAT-02 sincroniza (0–6 s), fica online (6–12 s) e
//     perde o link de novo; a cada ciclo um dos SAT-03..06 tenta o link e não
//     responde. Indicador "REDE ORBITAL n/6".
//   • Só satélite online observa: varre, trava no alvo (o gato vira OBSERVADO)
//     e perde o sinal — 6 s por satélite.
// Tudo é clima: sem coordenadas, sem lugares; os graus são ornamento.
// prefers-reduced-motion: nada se move, só os estados trocam.

import { useEffect, useRef, useState } from "react";
import { LOGO_CAMADAS as L } from "../assets/logo-camadas";
import { agoraSch } from "../relogio";
import { horaSPTexto } from "../secoes";
import { Ic } from "./comum";

const CX = 600, CY = 360, ANEIS = [120, 185, 250, 305];
const SATS = [
  { id: "SAT-01", o: 0, a0: 40, w: 7 }, { id: "SAT-02", o: 1, a0: 160, w: 4.5 },
  { id: "SAT-03", o: 1, a0: 292, w: 4.5 }, { id: "SAT-04", o: 2, a0: 215, w: 3 },
  { id: "SAT-05", o: 2, a0: 25, w: 3 }, { id: "SAT-06", o: 3, a0: 118, w: 2 },
];
const SINAL_ONLINE = [4, 3];
const MACRO = 12, OBS = 6, TRAVA = 3.4, PERDE = 5.6, TENTA: [number, number] = [2, 4.2], HIST = 12;
const rad = (g: number) => (g * Math.PI) / 180;
const pol = (r: number, g: number) => [CX + r * Math.cos(rad(g)), CY + r * Math.sin(rad(g))];
const f1 = (v: number) => v.toFixed(1);

type Link = "online" | "sincronizando" | "aguardando";
type Quadro = {
  m: number; u: number; c: number; v: number; quem: string;
  fase: "busca" | "trava" | "perdido"; obs: boolean;
  links: Record<string, Link>; online: number; tentativa: string;
};
const tentativaDo = (m: number) => SATS[2 + (m % 4)].id;
function quadro(t: number): Quadro {
  const m = Math.floor(t / MACRO), u = t - m * MACRO;
  const c = Math.floor(t / OBS), v = t - c * OBS;
  const sat02 = u >= OBS;
  const quem = sat02 ? "SAT-02" : "SAT-01";
  const fase = v < TRAVA ? "busca" : v < PERDE ? "trava" : "perdido";
  const tentativa = tentativaDo(m);
  const links: Record<string, Link> = {};
  for (const s of SATS) links[s.id] = "aguardando";
  links["SAT-01"] = "online";
  links["SAT-02"] = sat02 ? "online" : "sincronizando";
  if (u >= TENTA[0] && u < TENTA[1]) links[tentativa] = "sincronizando";
  return { m, u, c, v, quem, fase, obs: fase === "trava", links, online: sat02 ? 2 : 1, tentativa };
}
const chaveDe = (q: Quadro) => `${q.c}-${q.fase}-${q.links[q.tentativa]}`;
const rotuloLink = { online: "Online", sincronizando: "Sincronizando", aguardando: "Aguardando link" } as const;

export function Vigilancia({ subs }: { subs: { id: string; titulo: string; estado: string; aberto: boolean }[] }) {
  const svg = useRef<SVGSVGElement>(null);
  const [q, setQ] = useState<Quadro>(() => quadro(HIST + 0.3));
  const [movel, setMovel] = useState(() => matchMedia("(max-width: 600px)").matches);
  const inicio = useRef({ perf: performance.now(), ms: agoraSch() });

  useEffect(() => {
    const mq = matchMedia("(max-width: 600px)");
    const f = () => setMovel(mq.matches);
    mq.addEventListener?.("change", f);
    return () => mq.removeEventListener?.("change", f);
  }, []);

  useEffect(() => {
    const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = svg.current!;
    el.setAttribute("viewBox", movel ? `${CX - 340} ${CY - 340} 680 680` : "0 0 1200 720");
    let fundo = `<line class="eixo" x1="${CX - 330}" y1="${CY}" x2="${CX + 330}" y2="${CY}"/><line class="eixo" x1="${CX}" y1="${CY - 330}" x2="${CX}" y2="${CY + 330}"/>`;
    ANEIS.forEach((r, i) => {
      fundo += `<circle class="anel${i === 3 ? " o" : ""}" cx="${CX}" cy="${CY}" r="${r}"/>`;
      const p = pol(r, -128);
      fundo += `<text class="grau" x="${f1(p[0] + 6)}" y="${f1(p[1] - 4)}">Ó${i + 1}</text>`;
    });
    for (let g = 0; g < 360; g += 5) {
      const a = pol(318, g), b = pol(g % 30 ? 324 : 330, g);
      fundo += `<line class="tick" x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}"/>`;
      if (g % 30 === 0) { const t = pol(345, g); fundo += `<text class="grau" text-anchor="middle" dominant-baseline="middle" x="${f1(t[0])}" y="${f1(t[1])}">${String((g + 90) % 360).padStart(3, "0")}</text>`; }
    }
    const AL = 78, esc = AL / Math.max(L.w, L.h);
    fundo += `<g transform="translate(${f1(CX - (L.w * esc) / 2)},${f1(CY - (L.h * esc) / 2)}) scale(${esc.toFixed(4)})"><path data-p="sil" class="alvo-sil" d="${L.silhueta}"/></g>`;
    fundo += `<text data-p="rot" class="rot-alvo" x="${movel ? CX - 330 : 30}" y="${movel ? CY - 310 : 40}"></text>`;
    fundo += `<text data-p="rede" class="rot-rede" x="${movel ? CX - 330 : 30}" y="${movel ? CY - 280 : 66}"></text>`;
    el.innerHTML = fundo + `<g data-p="cone"></g><g data-p="sats"></g><g data-p="ret"></g>`;
    const pe = (n: string) => el.querySelector(`[data-p="${n}"]`) as SVGElement;
    const cone = pe("cone"), sats = pe("sats"), ret = pe("ret"), sil = pe("sil"), rot = pe("rot"), rede = pe("rede");
    let ultima = "";

    function desenha(t: number) {
      const qq = quadro(t), mov = reduz ? 0 : 1;
      let s = "", pq: number[] | null = null;
      for (const sat of SATS) {
        const ang = sat.a0 + (mov ? sat.w * t : 0), p = pol(ANEIS[sat.o], ang);
        const link = qq.links[sat.id], ob = sat.id === qq.quem && qq.obs;
        if (sat.id === qq.quem) pq = p;
        const cls = `sat ${link === "online" ? "on" : link === "sincronizando" ? "sync" : "off"}${ob ? " obs" : ""}`;
        if (link === "sincronizando") s += `<circle class="anel-sync" cx="${f1(p[0])}" cy="${f1(p[1])}" r="16"/>`;
        s += `<g class="${cls}" transform="translate(${f1(p[0])},${f1(p[1])}) rotate(${f1(ang + 90)})"><line x1="-15" y1="0" x2="-6" y2="0"/><line x1="6" y1="0" x2="15" y2="0"/><line x1="-15" y1="-4" x2="-15" y2="4"/><line x1="15" y1="-4" x2="15" y2="4"/><rect x="-5" y="-5" width="10" height="10"/></g>`;
        s += `<text class="rot-sat ${link === "online" ? "on" : "off"}" x="${f1(p[0] + 14)}" y="${f1(p[1] - 12)}"${ob ? ' style="font-weight:700"' : ""}>${sat.id}</text>`;
      }
      sats.innerHTML = s;
      let c = "";
      if (pq && qq.fase !== "perdido") {
        const para = (Math.atan2(CY - pq[1], CX - pq[0]) * 180) / Math.PI;
        const desv = qq.fase === "busca" && mov ? 34 * Math.sin(qq.v * 2.2) * (1 - qq.v / TRAVA) : 0;
        const dir = para + desv, d = Math.hypot(CX - pq[0], CY - pq[1]) + 46, ab = 7;
        const e1 = [pq[0] + d * Math.cos(rad(dir - ab)), pq[1] + d * Math.sin(rad(dir - ab))];
        const e2 = [pq[0] + d * Math.cos(rad(dir + ab)), pq[1] + d * Math.sin(rad(dir + ab))];
        c = `<path class="cone" d="M${f1(pq[0])} ${f1(pq[1])}L${f1(e1[0])} ${f1(e1[1])}L${f1(e2[0])} ${f1(e2[1])}Z"/>`;
        if (qq.obs) c += `<line class="feixe" x1="${f1(pq[0])}" y1="${f1(pq[1])}" x2="${CX}" y2="${CY}"/>`;
      }
      cone.innerHTML = c;
      const k = qq.fase === "busca" && mov ? 1 - qq.v / TRAVA : 0;
      const ox = 46 * Math.cos(qq.v * 1.7) * k, oy = 30 * Math.sin(qq.v * 2.3) * k;
      const fecha = qq.fase === "trava" ? Math.min(1, (qq.v - TRAVA) / 0.25) : 0;
      const h = (qq.fase === "trava" ? 74 - 14 * fecha : 74) + 26 * k, x = CX + ox, y = CY + oy, m = 14;
      const cant = (sx: number, sy: number) => `M${f1(x + sx * h)} ${f1(y + sy * (h - m))}V${f1(y + sy * h)}H${f1(x + sx * (h - m))}`;
      ret.innerHTML = qq.fase === "perdido" ? "" : `<g class="reticulo ${qq.obs ? "trava" : "busca"}"><path d="${cant(-1, -1)}${cant(1, -1)}${cant(1, 1)}${cant(-1, 1)}"/><path d="M${f1(x - 6)} ${f1(y)}H${f1(x + 6)}M${f1(x)} ${f1(y - 6)}V${f1(y + 6)}"/></g>`;
      sil.setAttribute("class", `alvo-sil${qq.obs ? " obs" : ""}`);
      rot.setAttribute("class", `rot-alvo${qq.obs ? " obs" : ""}`);
      rot.textContent = (movel ? "" : "ALVO · ") + (qq.obs ? "OBSERVADO" : "NÃO OBSERVADO");
      rede.textContent = `REDE ORBITAL ${qq.online}/6`;
      const chave = chaveDe(qq);
      if (chave !== ultima) { ultima = chave; setQ(qq); }
    }

    const t0 = () => HIST + 0.3 + (performance.now() - inicio.current.perf) / 1000;
    let raf = 0, iv = 0;
    if (reduz) {
      const passo = () => desenha(HIST + 0.3 + Math.floor((t0() - HIST - 0.3) / 2) * 2 + 0.01);
      passo();
      iv = window.setInterval(passo, 500);
    } else {
      const anda = () => { desenha(t0()); raf = requestAnimationFrame(anda); };
      anda();
    }
    return () => { cancelAnimationFrame(raf); window.clearInterval(iv); };
  }, [movel]);

  // registro: eventos de todos os ciclos até agora, mais recente no topo
  const t = q.m * MACRO + q.u;
  const horaDe = (x: number) => horaSPTexto(inicio.current.ms + (x - HIST - 0.3) * 1000, true);
  const ev: [number, string, boolean][] = [[0, "Sistema · reconectando à rede orbital", false], [0.1, "SAT-01 · online · rede orbital 1/6", false]];
  for (let mi = 0; mi <= q.m; mi++) {
    const b = mi * MACRO, tent = tentativaDo(mi);
    ev.push(
      [b + 0.3, "SAT-02 · sincronizando", false],
      [b + 0.4, "SAT-01 · varredura", false],
      [b + TENTA[0], `${tent} · tentativa de link`, false],
      [b + TRAVA, "SAT-01 · alvo adquirido ·", true],
      [b + TENTA[1], `${tent} · sem resposta · aguardando link`, false],
      [b + PERDE, "SAT-01 · sinal perdido", false],
      [b + OBS, "SAT-02 · online · rede orbital 2/6", false],
      [b + OBS + 0.2, "SAT-02 · varredura", false],
      [b + OBS + TRAVA, "SAT-02 · alvo adquirido ·", true],
      [b + OBS + PERDE, "SAT-02 · sinal perdido", false],
      [b + MACRO - 0.1, "SAT-02 · link instável · rede orbital 1/6", false],
    );
  }
  const vis = ev.filter((e) => e[0] <= t + 0.05).sort((a, b) => b[0] - a[0]).slice(0, 7);
  const txt = q.obs ? "OBSERVADO" : "NÃO OBSERVADO";

  return (
    <div className="vig">
      <section className="ficha mapa-ficha" aria-label="Mapa das órbitas">
        <header><span className="t-rotulo">Vista plana · órbitas 1–4</span><span className="t-mini">{q.obs ? `${q.quem} · alvo adquirido` : q.fase === "busca" ? `${q.quem} · em varredura` : "Sinal perdido"}</span></header>
        <div className="corpo">
          <svg className="mapa" ref={svg} preserveAspectRatio="xMidYMid meet" aria-hidden="true" />
          <div className="leg-mapa" aria-hidden="true">
            <span><Ic id="i-sat" mini />Online</span>
            <span><svg width="14" height="14"><rect x="2" y="2" width="10" height="10" fill="none" stroke="#688EBE" strokeDasharray="2 2" /></svg>Aguardando link</span>
            <span><svg width="22" height="10"><path d="M0 5h22" stroke="#688EBE" strokeDasharray="4 4" /></svg>Campo de visão</span>
            <span><svg width="14" height="14"><path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" fill="none" stroke="#C8323C" strokeWidth="1.6" /></svg>Alvo travado</span>
          </div>
        </div>
      </section>
      <aside className="lado" aria-label="Painel lateral">
        <section className="ficha">
          <header><span className="t-rotulo">Estado do gato</span><span className="t-mini">Alvo</span></header>
          <div style={{ padding: "16px 20px 4px", display: "flex" }}>
            <div className="gato" role="status" aria-live="polite">
              <span className="g-rot">ESTADO</span><span className="g-cel sup">VIVO</span><span className="g-cel sup">MORTO</span>
              <span className={`g-cel ${q.obs ? "obs" : "ativo"}`}><span className="pulso" />{txt}</span>
            </div>
          </div>
          <div className="alvo-linha"><span>Alvo</span><span className="retido">Dados retidos</span></div>
        </section>
        <section className="ficha">
          <header><span className="t-rotulo">Satélites</span><span className="t-mini">Reconectando</span></header>
          <div className="rede-corpo" role="img" aria-label={`Rede orbital: ${q.online} de 6 satélites online`}>
            <span className="rot">Rede orbital</span>
            <span className="n">{q.online}<small>/6</small></span>
            <div className="segs-rede" aria-hidden="true">
              {SATS.map((s) => <i key={s.id} className={q.links[s.id]} />)}
            </div>
          </div>
          <ul className="sats">
            {SATS.map((s, i) => {
              const link = q.links[s.id];
              const ob = s.id === q.quem && q.obs;
              const st = ob ? "Alvo adquirido" : rotuloLink[link];
              const sinal = link === "online" ? SINAL_ONLINE[i] ?? 3 : link === "sincronizando" ? 1 : 0;
              return (
                <li key={s.id} className={`${ob ? "obs" : ""} ${link}`}>
                  <span>{s.id}</span><span>Órbita {s.o + 1}</span><span className="st">{st}</span>
                  <span className="sinal" role="img" aria-label={`sinal ${sinal} de 4`}>
                    {[1, 2, 3, 4].map((b) => <i key={b} className={b > sinal ? "off" : ""} style={{ height: b * 3 }} />)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        {subs.map((x) => (
          <div className="trancado" key={x.id}><Ic id={x.aberto ? "i-aberta" : "i-cadeado"} />{x.titulo}<span className="dir">{x.estado}</span></div>
        ))}
        <section className="ficha log-ficha">
          <header><span className="t-rotulo">Registro</span><span className="t-mini">Mais recente no topo</span></header>
          <ul className="log" aria-live="off">
            {vis.map(([tt, s, retido], i) => (
              <li key={`${tt}-${i}`}><time>{horaDe(tt)}</time><span>{s}{retido && <> <span className="retido">Dados retidos</span></>}</span></li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
