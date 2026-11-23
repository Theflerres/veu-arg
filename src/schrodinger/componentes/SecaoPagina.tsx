// Página de uma seção (#/s/<id>). Fechada: só "RECONECTANDO" e a data.
// Trancada por chave: o formulário. Aberta: o componente próprio (fase A) ou
// os blocos genéricos do conteúdo liberado.

import { useMemo } from "react";
import { decifraTexto } from "../../app/cifra";
import { LIBERADO, abreMs, contagem, dataCurta, estadoDe, secao, type Bloco } from "../secoes";
import { Blocos } from "./Blocos";
import { Ic } from "./comum";
import { subItens } from "./Home";
import { Players } from "./Players";
import { Trava } from "./Trava";
import { Vigilancia } from "./Vigilancia";

function Cabecalho({ id, titulo, meta }: { id: string; titulo: string; meta?: string }) {
  return (
    <div className="cab-sec">
      <div>
        <nav className="migalha" aria-label="Caminho"><Ic id="i-volta" /><a href="#/">Painel</a> / <span>Seção {id}</span></nav>
        <h1 className="t-titulo">{titulo}</h1>
        {meta && <div className="meta">{meta}</div>}
      </div>
    </div>
  );
}

export function SecaoPagina({ id, agoraMs, destravadas, onDestrava }: {
  id: string; agoraMs: number; destravadas: Record<string, string>; onDestrava: (id: string, chave: string) => void;
}) {
  const s = secao(id);
  const c = LIBERADO[id];
  const e = s ? estadoDe(s, agoraMs, destravadas) : "reconectando";
  const chave = destravadas[id];
  const blocosTrava = useMemo<Bloco[] | null>(() => {
    if (!c?.trava?.blocos || !chave) return null;
    try {
      return JSON.parse(decifraTexto(c.trava.blocos, chave)) as Bloco[];
    } catch {
      return null;
    }
  }, [c, chave]);

  if (!s || s.pai) {
    return <div className="conteudo-sec"><Cabecalho id={id} titulo="Seção desconhecida" /><p><a href="#/">Voltar ao painel</a></p></div>;
  }
  if (!c || e === "reconectando" || e === "sincronizando") {
    const abre = abreMs(s);
    return (
      <div className="conteudo-sec">
        <Cabecalho id={id} titulo="Reconectando…" />
        <section className="ficha stub" aria-label="Seção reconectando">
          <div className="reconecta" aria-hidden="true" />
          <p className="t-rotulo" style={{ margin: 0 }}>
            {e === "sincronizando" ? "Conexão restabelecida · sincronizando" : `Abre em ${dataCurta(abre)}`}
            {e === "reconectando" && s.contagem ? ` · ${contagem(abre - agoraMs)}` : ""}
          </p>
          <p style={{ margin: 0 }}>O sistema ainda não restabeleceu a conexão com esta caixa.</p>
          <a className="botao" href="#/" style={{ alignSelf: "flex-start" }}><Ic id="i-volta" />Painel</a>
        </section>
      </div>
    );
  }
  if (e === "chave") {
    return (
      <div className="conteudo-sec">
        <Cabecalho id={id} titulo={c.titulo} meta="Trancada por chave" />
        <section className="ficha" style={{ maxWidth: 880 }} aria-label="Ficha de acesso da seção">
          <header><span className="t-rotulo">Ficha de acesso</span><span className="t-mini">Seção {id}</span></header>
          <Trava hash={c.trava?.sha256 ?? null} rotulo="Chave de acesso" botao="Abrir" autoFocus onAceita={(k) => onDestrava(id, k)} />
        </section>
      </div>
    );
  }
  const subs = subItens(s, agoraMs);
  return (
    <div className="conteudo-sec">
      <Cabecalho id={id} titulo={c.titulo} meta={c.subtitulo} />
      {c.componente === "vigilancia" ? (
        <Vigilancia subs={subs} />
      ) : c.componente === "players" ? (
        <Players />
      ) : (
        <Blocos blocos={blocosTrava ?? c.blocos ?? []} agoraMs={agoraMs} />
      )}
    </div>
  );
}
