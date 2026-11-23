// Fichas dos players: foto + nome, e todo o resto tarjado. Nenhum dado real.
// Fotos: photos/players/ (as mesmas do Scanner). Nomes: os de
// src/app/grupos-membros-data.ts quando o player está num grupo (inclusive
// "??"); senão, o nome do arquivo. O Hunter West fica fora (é o titular).

import { MEMBROS_POR_GRUPO, slugify } from "../../app/grupos-membros-data";
import { Valor } from "./comum";

const FOTOS = import.meta.glob("../../../photos/players/*.{png,jpg,jpeg,webp,gif,avif}", {
  eager: true, query: "?url", import: "default",
}) as Record<string, string>;

const chave = (t: string) => slugify(t).replace(/-/g, "");

const NOMES = new Map<string, string>();
for (const lista of Object.values(MEMBROS_POR_GRUPO)) {
  for (const m of lista) {
    if (typeof m === "string") NOMES.set(chave(m), m);
    else NOMES.set(chave(m.foto), m.nome);
  }
}

type Ficha = { nome: string; url: string; k: string };
const FICHAS: Ficha[] = Object.entries(FOTOS)
  .map(([caminho, url]) => {
    const base = caminho.split("/").pop()!.replace(/\.[^.]+$/, "");
    const k = chave(base);
    return { nome: NOMES.get(k) ?? base, url, k };
  })
  .filter((f) => f.k && !f.k.startsWith("hunterwest"))
  .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));

// largura de tarja por ficha (determinística) para não parecer carimbo repetido
const h = (s: string, k: number) => {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
  x = Math.imul(x ^ k, 2246822519);
  return (x >>> 0) / 4294967296;
};
const tarja = (s: string, k: number, min: number, max: number) => "█".repeat(Math.round((min + h(s, k) * (max - min)) / 9));

export function Players() {
  return (
    <>
      <div className="resumo" role="group" aria-label="Resumo">
        <span><b>{FICHAS.length}</b> fichas</span><span><b>{FICHAS.length}</b> observados</span><span>Dados <b>retidos</b></span>
      </div>
      <ul className="grade-pl" aria-label="Fichas">
        {FICHAS.map((f, i) => (
          <li key={f.k}>
            <article className="ficha pl" aria-label={`Ficha ${i + 1}: ${f.nome}`}>
              <header><span>Nº 01-{String(i + 1).padStart(3, "0")}</span><span className="obs"><i aria-hidden="true" />Obs.</span></header>
              <div className="foto"><img src={f.url} alt={`Foto de ${f.nome}`} loading="lazy" decoding="async" /><span className="faixa" aria-hidden="true">Sujeito</span></div>
              <h2>{f.nome}</h2>
              <dl>
                <dt>ID</dt><dd><Valor v={tarja(f.nome, 1, 34, 70)} /></dd>
                <dt>Origem</dt><dd><span className="retido">Retido</span></dd>
                <dt>Estado</dt><dd><Valor v={tarja(f.nome, 2, 28, 64)} /></dd>
                <dt>Última obs.</dt><dd><Valor v={tarja(f.nome, 3, 40, 58)} /></dd>
              </dl>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
