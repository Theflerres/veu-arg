// Transição P3 → Schrödinger (≈ 7 s), só na primeira visita depois da virada.
// 1 perda de sinal · 2 redirecionamento (faixas) · 3 a caixa se abre · e o
// login entra. prefers-reduced-motion: corte do quadro 1 para o login, com
// fade curto. Esc, Enter ou clique pulam.

import { useEffect, useRef, useState } from "react";
import { paraTodosFx, tocaFx, type FxNome } from "../../app/sounds";
import { estaMudo } from "../miau";

export function Transicao({ onFim }: { onFim: () => void }) {
  const [q, setQ] = useState(0);
  const fim = useRef(onFim);
  fim.current = onFim;

  useEffect(() => {
    const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tempos = reduz ? [1600, 0, 0] : [1600, 1800, 1600];
    const timers: number[] = [];
    let t = 0;
    // efeitos que já existem (public/sounds/fx); sem gesto do visitante o
    // navegador pode barrar — aí a transição segue muda
    const som = (nome: FxNome) => {
      if (!estaMudo()) void tocaFx(nome);
    };
    som("estatica-1");
    tempos.forEach((d, i) => {
      if (!d) return;
      timers.push(window.setTimeout(() => {
        setQ(i);
        if (i === 1) som("glitch-1");
      }, t));
      t += d;
    });
    timers.push(window.setTimeout(() => fim.current(), t + (reduz ? 300 : 0)));
    const pula = (ev: Event) => {
      if (ev instanceof KeyboardEvent && !["Escape", "Enter", " "].includes(ev.key)) return;
      fim.current();
    };
    window.addEventListener("keydown", pula);
    window.addEventListener("pointerdown", pula);
    return () => {
      timers.forEach((x) => window.clearTimeout(x));
      window.removeEventListener("keydown", pula);
      window.removeEventListener("pointerdown", pula);
      paraTodosFx();
    };
  }, []);

  return (
    <div className="sch-trans" role="presentation" aria-label="Conexão redirecionada">
      <p className="so-leitor" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }} aria-live="polite">
        Sinal perdido. Conexão redirecionada para o Sistema Schrödinger.
      </p>
      <div className={`q q1 p3 crt${q === 0 ? " on" : ""}`}>
        <div className="cab"><span>P3_KERNEL // SESSÃO ATIVA</span><span>SYS/v4.7.2</span></div>
        <div className="linhas">
          &gt; verificando canal .......... OK<br />
          &gt; verificando canal .......... OK<br />
          &gt; verificando canal .......... INSTÁVEL<br />
          <span className="fraco">&gt; verificando canal .......... ▒▒▒</span>
        </div>
        <div className="grande">SINAL PERDIDO</div>
      </div>
      <div className={`q q2 p3 crt${q === 1 ? " on" : ""}`}>
        <div className="faixa escura" style={{ top: 0, height: "17%" }} />
        <div className="faixa clara" style={{ top: "17%", height: "4%", transform: "translateX(6%)" }} />
        <div className="faixa escura" style={{ top: "21%", height: "18%", transform: "translateX(-3%)" }}>
          <div style={{ font: "clamp(18px,2.4vw,44px) VT323, monospace", color: "#00FF66", padding: "3vh 6vw" }}>&gt; verificando canal .......... ▒▒▒</div>
        </div>
        <div className="faixa clara" style={{ top: "71%", height: "8%", transform: "translateX(-10%)" }}>
          <div style={{ fontSize: "clamp(14px,2vw,40px)", padding: "1.6vh 20vw", letterSpacing: ".3em", whiteSpace: "nowrap" }}>SISTEMA SCHRÖDINGER</div>
        </div>
        <div className="faixa escura" style={{ top: "79%", height: "2%", transform: "translateX(4%)" }} />
        <div className="faixa clara" style={{ top: "81%", height: "2.6%", transform: "translateX(15%)" }} />
        <div className="faixa clara" style={{ top: "89%", height: "6.5%", transform: "translateX(-5%)" }} />
        <div className="msg"><span className="a">CONEXÃO REDIRECIONADA</span><span className="b">ROTA ALTERADA</span></div>
      </div>
      <div className={`q q3${q === 2 ? " on" : ""}`}>
        <div className="resto">&gt; _</div>
        <div className="luz">
          <span className="t1">Terminal assumido</span>
          <span className="t2">Conexão redirecionada para: Sistema Schrödinger</span>
        </div>
      </div>
    </div>
  );
}
