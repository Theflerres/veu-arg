import { useEffect, type ReactNode } from "react";
import logoInvertida from "../assets/logo-invertida.svg";
import { defineMudo, estaMudo, useMudo } from "../miau";
import { TEXTOS } from "../config";

/** Ícones de traço (mesmo desenho dos mockups). */
export function Icones() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <symbol id="sch-cx-fechada" viewBox="0 0 96 96"><path d="M14 36h68v46H14z" /><path d="M10 26h76v10H10z" /><path d="M42 31h12" /><circle cx="48" cy="55" r="4" /><path d="M48 59v8" /></symbol>
      <symbol id="sch-cx-aberta" viewBox="0 0 96 96"><path d="M14 44h68v38H14z" /><path d="M14 44 L 22 16 L 88 26 L 82 44" /><path d="M30 58h36M30 66h24" /></symbol>
      <symbol id="sch-cx-negada" viewBox="0 0 96 96"><path d="M14 36h68v46H14z" /><path d="M10 26h76v10H10z" /><path d="M38 50l20 20M58 50 38 70" /></symbol>
      <symbol id="sch-i-chave" viewBox="0 0 20 20"><circle cx="6" cy="10" r="3.5" /><path d="M9.5 10H18M15 10v3M17.5 10v2" /></symbol>
      <symbol id="sch-i-aberta" viewBox="0 0 20 20"><path d="M4 10.5l4 4 8-9" /></symbol>
      <symbol id="sch-i-reconecta" viewBox="0 0 20 20"><path d="M3 4h14M3 8h9M3 12h12M3 16h6" /></symbol>
      <symbol id="sch-i-cadeado" viewBox="0 0 20 20"><path d="M4.5 9h11v8.5h-11zM7 9V6.5a3 3 0 0 1 6 0V9" /></symbol>
      <symbol id="sch-i-volta" viewBox="0 0 20 20"><path d="M17 10H4M9 5l-5 5 5 5" /></symbol>
      <symbol id="sch-i-seta" viewBox="0 0 20 20"><path d="M3 10h13M11 5l5 5-5 5" /></symbol>
      <symbol id="sch-i-alerta" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" /><path d="M10 6v5M10 13.5v.5" /></symbol>
      <symbol id="sch-i-arquivo" viewBox="0 0 20 20"><path d="M2.5 4h15v4h-15zM4 8v8h12V8M8 11h4" /></symbol>
      <symbol id="sch-i-sat" viewBox="0 0 20 20"><path d="M7 7h6v6H7zM2 10h5M13 10h5M10 13v4" /></symbol>
      <symbol id="sch-i-som" viewBox="0 0 20 20"><path d="M3 8h3l4-3v10l-4-3H3z" /><path d="M13 7.5a3.5 3.5 0 0 1 0 5M15.5 5.5a6.5 6.5 0 0 1 0 9" /></symbol>
      <symbol id="sch-i-mudo" viewBox="0 0 20 20"><path d="M3 8h3l4-3v10l-4-3H3z" /><path d="M13.5 8l4 4M17.5 8l-4 4" /></symbol>
    </svg>
  );
}

export const Ic = ({ id, mini, className }: { id: string; mini?: boolean; className?: string }) => (
  <svg className={`ic${mini ? " ic-mini" : ""}${className ? " " + className : ""}`} aria-hidden="true" focusable="false">
    <use href={`#sch-${id}`} />
  </svg>
);

/** Tecla M = mudo (fora de campos de texto). Um ouvinte por página. */
export function useTeclaMudo() {
  useEffect(() => {
    const f = (ev: KeyboardEvent) => {
      const alvo = ev.target as HTMLElement | null;
      const tag = alvo?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || alvo?.isContentEditable) return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.key === "m" || ev.key === "M") {
        ev.preventDefault();
        defineMudo(!estaMudo());
      }
    };
    document.addEventListener("keydown", f);
    return () => document.removeEventListener("keydown", f);
  }, []);
}

export function BotaoMudo() {
  const [mudo, setMudo] = useMudo();
  return (
    <button
      className="mudo"
      type="button"
      aria-pressed={mudo}
      aria-label={mudo ? "Ativar o som do sistema (tecla M)" : "Silenciar o sistema (tecla M)"}
      title={mudo ? "Som desligado (M)" : "Som ligado (M)"}
      onClick={() => setMudo(!mudo)}
    >
      <Ic id={mudo ? "i-mudo" : "i-som"} />
    </button>
  );
}

export function Barra({ naHome, onSair }: { naHome: boolean; onSair: () => void }) {
  return (
    <header className="barra">
      <a className="marca" href="#/" aria-label="Sistema Schrödinger — painel">
        <span className="ladrilho"><img src={logoInvertida} alt="" /></span>
        <span className="t-sistema">Sistema Schrödinger</span>
      </a>
      <nav aria-label="Seções do sistema">
        <a href="#/" aria-current={naHome ? "page" : undefined}>Painel</a>
      </nav>
      <span className="esp" />
      <span className="observado" role="status"><span className="pulso" />OBSERVADO</span>
      <BotaoMudo />
      <button className="sair" type="button" onClick={onSair}>Sair</button>
    </header>
  );
}

export function Pagina({ naHome, onSair, children }: { naHome: boolean; onSair: () => void; children: ReactNode }) {
  return (
    <div className="pagina">
      <a className="pular" href="#sch-principal">Pular para o conteúdo</a>
      <Barra naHome={naHome} onSair={onSair} />
      <main id="sch-principal" tabIndex={-1}>{children}</main>
    </div>
  );
}

export const titular = TEXTOS.titular;

/** Valor de campo: "[DADOS RETIDOS]" vira selo; sequência de █ vira tarja. */
export function Valor({ v }: { v: string }) {
  if (/^\[DADOS RETIDOS\]$/i.test(v.trim())) return <span className="retido">Dados retidos</span>;
  const m = /^█+$/.exec(v.trim());
  if (m) return <span className="tarja" style={{ width: `${m[0].length * 9}px` }} role="img" aria-label="tarjado" />;
  return <>{v}</>;
}
