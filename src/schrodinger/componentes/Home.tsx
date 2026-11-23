// Painel: uma caixa por seção (00–06) no estado que a data dela manda.
//   ABERTA      — o conteúdo já está no bundle;
//   TRANCADA    — abriu pela data, mas pede a chave (modelo data+resposta);
//   RECONECTANDO   — aparece, não abre; sem título real (ele nem está no bundle);
//   sincronizando — a hora passou, o build novo ainda não chegou.

import {
  LIBERADO, PRINCIPAIS, abreMs, contagem, dataCurta, dataSPTexto, estadoDe, filhas, horaSPTexto,
  type Estado, type Secao,
} from "../secoes";
import { Ic, titular } from "./comum";
import { Trava } from "./Trava";

/** Linhas de sub-itens (ex.: um painel trancado dentro de uma seção aberta).
 *  Só aparecem se já houver título liberado para elas. */
export function subItens(s: Secao, agoraMs: number) {
  const pai = LIBERADO[s.id];
  return filhas(s.id).flatMap((f) => {
    const c = LIBERADO[f.id];
    if (c) return [{ id: f.id, titulo: c.titulo, estado: c.estado ?? "Aberto", aberto: !c.estado }];
    const slot = pai?.blocos?.find((b) => b.tipo === "subsecao" && b.id === f.id);
    if (!slot || slot.tipo !== "subsecao") return [];
    const quando = agoraMs >= abreMs(f) ? "Sincronizando" : `Abre em ${dataCurta(abreMs(f))}`;
    return [{ id: f.id, titulo: slot.titulo, estado: quando, aberto: false }];
  });
}

function Caixa({ s, e, agoraMs, onDestrava }: { s: Secao; e: Estado; agoraMs: number; onDestrava: (id: string, chave: string) => void }) {
  const c = LIBERADO[s.id];
  const cab = (icone: string) => (
    <header><span className="t-rotulo"><span className="num">{s.id}</span>Seção</span><Ic id={icone} /></header>
  );
  if (e === "aberta" && c) {
    return (
      <a className="ficha cx aberta" href={`#/s/${s.id}`}>
        {cab("i-aberta")}
        <div className="corpo">
          <h2>{c.titulo}</h2>
          <div className="desenho" aria-hidden="true"><svg><use href="#sch-cx-aberta" /></svg></div>
          {subItens(s, agoraMs).map((x) => (
            <div className="trancado" key={x.id}><Ic id={x.aberto ? "i-aberta" : "i-cadeado"} />{x.titulo}<span className="dir">{x.estado}</span></div>
          ))}
          <div className="estado"><Ic id="i-aberta" />Aberta{c.resumo && c.resumo !== "Aberta" ? ` · ${c.resumo}` : ""}</div>
        </div>
        {s.id === "00" && <span className="carimbo" aria-hidden="true">Aberta</span>}
      </a>
    );
  }
  if (e === "chave" && c) {
    return (
      <div className="ficha cx chave">
        {cab("i-chave")}
        <div className="corpo">
          <h2>{c.titulo}</h2>
          <div className="desenho" aria-hidden="true"><svg><use href="#sch-cx-fechada" /></svg></div>
          <div className="chave-inline" style={{ margin: "0 -24px" }}>
            <Trava hash={c.trava?.sha256 ?? null} rotulo="Chave de acesso" botao="Abrir" onAceita={(k) => onDestrava(s.id, k)} />
          </div>
          <div className="estado"><Ic id="i-chave" />Trancada · requer chave</div>
        </div>
      </div>
    );
  }
  const abre = abreMs(s);
  return (
    <div className="ficha cx reconectando" aria-disabled="true">
      {cab("i-reconecta")}
      <div className="corpo">
        <h2><span>Reconectando</span><span className="pts" aria-hidden="true" /></h2>
        <div className="desenho" aria-hidden="true"><svg><use href="#sch-cx-fechada" /></svg></div>
        <div className="reconecta" aria-hidden="true" />
        {e === "sincronizando" ? (
          <div className="conta"><span>Sincronizando</span><b>00h 00m 00s</b></div>
        ) : (
          <div className="conta">
            <span>Abre em {dataCurta(abre)}</span>
            {s.contagem && <b aria-label={`faltam ${contagem(abre - agoraMs)}`}>{contagem(abre - agoraMs)}</b>}
          </div>
        )}
        <div className="estado"><Ic id="i-reconecta" />Reconectando · sem conexão</div>
      </div>
    </div>
  );
}

export function Home({ agoraMs, sessaoMs, destravadas, onDestrava }: {
  agoraMs: number; sessaoMs: number; destravadas: Record<string, string>; onDestrava: (id: string, chave: string) => void;
}) {
  const estados = PRINCIPAIS.map((s) => estadoDe(s, agoraMs, destravadas));
  const abertas = estados.filter((e) => e === "aberta").length;
  return (
    <div className="conteudo-home">
      <div className="cab">
        <div>
          <h1 className="t-titulo">Painel</h1>
          <div className="meta">Titular: {titular} · Sessão aberta {dataSPTexto(sessaoMs)} {horaSPTexto(sessaoMs)}</div>
        </div>
        <div className="progresso">
          <div className="legenda" aria-hidden="true"><span><i />Aberta</span><span><i className="idx" />Reconectando</span><span><i className="ch" />Trancada por chave</span></div>
          <span className="t-rotulo">{abertas} de {PRINCIPAIS.length} seções abertas</span>
          <div className="segs" aria-hidden="true">{estados.map((e, i) => <i key={i} className={e === "aberta" ? "on" : ""} />)}</div>
        </div>
      </div>
      <ul className="grade" aria-label="Seções">
        {PRINCIPAIS.map((s, i) => (
          <li key={s.id}><Caixa s={s} e={estados[i]} agoraMs={agoraMs} onDestrava={onDestrava} /></li>
        ))}
        <li>
          <div className="ficha cx status">
            <header><span className="t-rotulo">Estado do sistema</span></header>
            <div className="corpo">
              <dl>
                <dt>Titular</dt><dd>{titular}</dd>
                <dt>Gato</dt><dd style={{ color: "var(--sch-alert)", fontWeight: 500 }}>Observado</dd>
                <dt>Rede</dt><dd>Reconectando</dd>
                <dt>Caixas</dt><dd>{abertas} {abertas === 1 ? "aberta" : "abertas"} · {PRINCIPAIS.length - abertas} {PRINCIPAIS.length - abertas === 1 ? "fechada" : "fechadas"}</dd>
                <dt>Sessão</dt><dd>{horaSPTexto(sessaoMs)}</dd>
              </dl>
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
}

