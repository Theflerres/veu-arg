// ============================================================================
// SISTEMA SCHRÖDINGER — aplicação (raiz do site depois de DATA_TRANSICAO)
// ============================================================================
// Fluxo: transição (só na 1ª visita) → login (miau) → painel.
// Rotas por hash (#/ e #/s/<id>): o GitHub Pages não serve caminhos internos.

import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CHAVES } from "./config";
import { PRINCIPAIS, TODAS, estadoDe, guardaChave, chaveAceita, useAgora, useSincroniza } from "./secoes";
import { agoraSch } from "./relogio";
import { Icones, Pagina, useTeclaMudo } from "./componentes/comum";
import { Home } from "./componentes/Home";
import { Login } from "./componentes/Login";
import { SecaoPagina } from "./componentes/SecaoPagina";
import { Transicao } from "./componentes/Transicao";
import "./estilo.css";

const ler = (onde: Storage | undefined, k: string) => {
  try {
    return onde?.getItem(k) ?? null;
  } catch {
    return null;
  }
};
const gravar = (onde: Storage | undefined, k: string, v: string | null) => {
  try {
    if (v === null) onde?.removeItem(k);
    else onde?.setItem(k, v);
  } catch {
    /* sem armazenamento: vale até recarregar */
  }
};
const ls = () => (typeof localStorage === "undefined" ? undefined : localStorage);
const ss = () => (typeof sessionStorage === "undefined" ? undefined : sessionStorage);

function useHash() {
  const [h, setH] = useState(() => window.location.hash);
  useEffect(() => {
    const f = () => setH(window.location.hash);
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return h;
}

function Schrodinger() {
  useTeclaMudo();
  const [etapa, setEtapa] = useState<"transicao" | "login" | "sistema">(() => {
    if (ler(ss(), CHAVES.sessao)) return "sistema";
    return ler(ls(), CHAVES.transicao) ? "login" : "transicao";
  });
  const [sessaoMs, setSessaoMs] = useState(() => Number(ler(ss(), CHAVES.sessao)) || agoraSch());
  const [destravadas, setDestravadas] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    for (const s of TODAS) { const k = chaveAceita(s.id); if (k) d[s.id] = k; }
    return d;
  });
  const agoraMs = useAgora();
  const hash = useHash();

  const fimTransicao = useCallback(() => {
    gravar(ls(), CHAVES.transicao, "1");
    setEtapa((e) => (e === "transicao" ? "login" : e));
  }, []);
  const entrar = useCallback(() => {
    const t = agoraSch();
    gravar(ss(), CHAVES.sessao, String(t));
    setSessaoMs(t);
    setEtapa("sistema");
    if (!window.location.hash) window.location.hash = "#/";
  }, []);
  const sair = useCallback(() => {
    gravar(ss(), CHAVES.sessao, null);
    window.location.hash = "";
    setEtapa("login");
  }, []);
  const destrava = useCallback((id: string, chave: string) => {
    guardaChave(id, chave);
    setDestravadas((d) => ({ ...d, [id]: chave }));
    window.location.hash = `#/s/${id}`;
  }, []);

  // seções cuja hora passou e o build ainda não trouxe: consulta liberadas.json
  const pendentes = TODAS.filter((s) => estadoDe(s, agoraMs, destravadas) === "sincronizando").map((s) => s.id);
  useSincroniza(etapa === "sistema" ? pendentes : []);

  const rota = /^#\/s\/([\w.]+)$/.exec(hash);
  const idSecao = rota && PRINCIPAIS.some((s) => s.id === rota[1]) ? rota[1] : null;

  useEffect(() => {
    document.title = etapa !== "sistema" ? "Sistema Schrödinger — Acesso" : idSecao ? `Seção ${idSecao} — Sistema Schrödinger` : "Painel — Sistema Schrödinger";
    if (etapa === "sistema") (document.getElementById("sch-principal") as HTMLElement | null)?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [etapa, idSecao]);

  return (
    <div className="sch">
      <Icones />
      {etapa === "transicao" ? (
        <Transicao onFim={fimTransicao} />
      ) : etapa === "login" ? (
        <Login onEntrar={entrar} />
      ) : (
        <Pagina naHome={!idSecao} onSair={sair}>
          {idSecao ? (
            <SecaoPagina key={idSecao} id={idSecao} agoraMs={agoraMs} destravadas={destravadas} onDestrava={destrava} />
          ) : (
            <Home agoraMs={agoraMs} sessaoMs={sessaoMs} destravadas={destravadas} onDestrava={destrava} />
          )}
        </Pagina>
      )}
    </div>
  );
}

export function monta() {
  document.documentElement.classList.add("sch-doc");
  document.documentElement.lang = "pt-BR";
  createRoot(document.getElementById("root")!).render(<Schrodinger />);
}
