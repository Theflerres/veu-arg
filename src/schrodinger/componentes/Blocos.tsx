// Blocos genéricos de conteúdo. O texto de toda seção vem do JSON liberado no
// build (src/schrodinger/liberado/) — aqui só existe a forma, nenhum nome nem
// texto de seção. Assim uma seção fechada não deixa rastro no código.

import { LIBERADO, abreMs, contagem, dataCurta, secao, type Bloco } from "../secoes";
import { Ic, Valor } from "./comum";

function Subsecao({ id, titulo, agoraMs }: { id: string; titulo: string; agoraMs: number }) {
  const f = secao(id);
  const c = LIBERADO[id];
  if (c) {
    return (
      <section className="ficha subsec" aria-label={c.titulo}>
        <header><span className="t-rotulo">{c.titulo}</span><span className="t-mini">{c.estado ?? "Aberto"}</span></header>
        <div className="miolo"><Blocos blocos={c.blocos ?? []} agoraMs={agoraMs} /></div>
      </section>
    );
  }
  const abre = f ? abreMs(f) : 0;
  const passou = !!f && agoraMs >= abre;
  return (
    <section className="ficha subsec fechado" aria-label={`${titulo}: trancado`}>
      <header><span className="t-rotulo">{titulo}</span><span className="t-mini">Trancado por data</span></header>
      <div className="miolo">
        <div className="cofre">
          <svg viewBox="0 0 96 96" aria-hidden="true"><path d="M22 44h52v38H22z" /><path d="M32 44V32a16 16 0 0 1 32 0v12" /><circle cx="48" cy="60" r="5" /><path d="M48 65v8" /></svg>
          <div>
            <div className="t">Trancado</div>
            <div className="s">{passou ? "Sincronizando" : f ? `Abre em ${dataCurta(abre)}` : ""}</div>
            {f?.contagem && !passou && <div className="s">{contagem(abre - agoraMs)}</div>}
          </div>
        </div>
        <div className="reconecta" aria-hidden="true" />
      </div>
    </section>
  );
}

/** Tom visual de um valor do log: ok (firme), vivo (em andamento), falha (sem conexão). */
function estadoDaLinha(v: string): "ok" | "vivo" | "falha" | "" {
  const s = v.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  if (/^(OK|ONLINE)/.test(s)) return "ok";
  if (/RECONECTANDO|SINCRONIZANDO/.test(s)) return "vivo";
  if (/DESCONECTAD|SEM SINAL|OFFLINE/.test(s)) return "falha";
  return "";
}

export function Blocos({ blocos, agoraMs }: { blocos: Bloco[]; agoraMs: number }) {
  return (
    <div className="blocos">
      {blocos.map((b, i) => {
        switch (b.tipo) {
          case "texto":
            return (
              <div className="bl-texto" key={i}>
                {b.titulo && <h2 className="t-rotulo">{b.titulo}</h2>}
                {b.paragrafos.map((p, j) => <p key={j}>{p}</p>)}
              </div>
            );
          case "ficha":
            return (
              <section className="ficha bl-ficha" key={i} aria-label={b.titulo}>
                <header><span className="t-rotulo">{b.titulo}</span>{b.meta && <span className="t-mini">{b.meta}</span>}</header>
                <dl>{b.campos.flatMap(([k, v], j) => [<dt key={`k${j}`}>{k}</dt>, <dd key={`v${j}`}><Valor v={v} /></dd>])}</dl>
              </section>
            );
          case "destaques":
            return (
              <div className="destaques" key={i}>
                {b.itens.map((it, j) => (
                  <section className={`ficha destaque${it.forte ? " forte" : ""}`} key={j} aria-label={`${it.grande} · ${it.titulo}`}>
                    <header><span className="t-rotulo">{it.rotulo}</span>{it.meta && <span className="t-mini">{it.meta}</span>}</header>
                    <div className="corpo">
                      <div className="grande" aria-hidden="true">{it.grande}</div>
                      <div>
                        <h2>{it.titulo}</h2>
                        <dl>{it.campos.flatMap(([k, v], n) => [<dt key={`k${n}`}>{k}</dt>, <dd key={`v${n}`}><Valor v={v} /></dd>])}</dl>
                      </div>
                    </div>
                    {it.carimbo && <span className="carimbo" aria-hidden="true">{it.carimbo}</span>}
                  </section>
                ))}
              </div>
            );
          case "arquivo":
            return (
              <section className="ficha bl-arquivo" key={i} aria-label={b.titulo}>
                <header><span className="t-rotulo">{b.titulo}</span>{b.meta && <span className="t-mini">{b.meta}</span>}</header>
                <ul className="linha">
                  {b.itens.map((it, j) => (
                    <li className="bk" key={j}>
                      <span className="n">{it.grande}</span>
                      <Ic id="i-arquivo" />
                      <p>{it.texto}</p>
                    </li>
                  ))}
                </ul>
                {b.rodape && <div className="rodape">{b.rodape}</div>}
              </section>
            );
          case "inicializacao":
            return (
              <section className="ficha bl-boot" key={i} aria-label={b.titulo}>
                <header><span className="t-rotulo">{b.titulo}</span>{b.meta && <span className="t-mini">{b.meta}</span>}</header>
                <ol className="boot">
                  {b.linhas.map(([k, v], j) => (
                    <li key={j} style={{ animationDelay: `${j * 0.12}s` }}>
                      <span className="k">{k}</span>
                      <span className="pontos" aria-hidden="true" />
                      <span className={`v ${estadoDaLinha(v)}`}>{estadoDaLinha(v) === "vivo" && <span className="pulso" aria-hidden="true" />}{v}</span>
                    </li>
                  ))}
                </ol>
              </section>
            );
          case "subsecao":
            return <Subsecao key={i} id={b.id} titulo={b.titulo} agoraMs={agoraMs} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
