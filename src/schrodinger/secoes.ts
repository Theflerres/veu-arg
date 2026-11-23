// ============================================================================
// SEÇÕES — o que está aberto, reconectando ou trancado por chave
// ============================================================================
// O build (scripts/liberar-secoes.mjs) põe em ./liberado/ só o conteúdo das
// seções cuja hora já chegou. É isso que manda: se o conteúdo está no bundle,
// a seção abriu. Seção fechada nem existe aqui — só o id e a data (de
// parte2/secoes.json), sem título.
//
// Se a hora já passou mas o conteúdo ainda não está no bundle (o build da hora
// ainda não rodou), a seção fica "sincronizando" e o site consulta
// <base>/liberadas.json até ela aparecer.

import { useEffect, useState } from "react";
import SECOES from "../../parte2/secoes.json";
import { agoraSch as agora } from "./relogio";
import { CHAVES } from "./config";

export type Campo = [string, string];
export type Bloco =
  | { tipo: "texto"; titulo?: string; paragrafos: string[] }
  | { tipo: "ficha"; titulo: string; meta?: string; campos: Campo[] }
  | {
      tipo: "destaques";
      itens: { rotulo: string; meta?: string; grande: string; titulo: string; campos: Campo[]; carimbo?: string; forte?: boolean }[];
    }
  | { tipo: "arquivo"; titulo: string; meta?: string; rodape?: string; itens: { grande: string; texto: string }[] }
  | { tipo: "subsecao"; id: string; titulo: string }
  | { tipo: "inicializacao"; titulo: string; meta?: string; linhas: Campo[] };

export type Conteudo = {
  id: string;
  canario?: string;
  titulo: string;
  subtitulo?: string;
  resumo?: string;
  estado?: string;
  componente?: "vigilancia" | "players";
  blocos?: Bloco[];
  trava?: { sha256: string | null; blocos?: string };
};

export type Secao = {
  id: string;
  pai?: string;
  fase: string;
  abre: string;
  modelo: "livre" | "data" | "data+resposta";
  contagem?: boolean;
};
export type Estado = "aberta" | "chave" | "reconectando" | "sincronizando";

const MODULOS = import.meta.glob("./liberado/*.json", { eager: true, import: "default" }) as Record<string, Conteudo>;
export const LIBERADO: Record<string, Conteudo> = {};
for (const c of Object.values(MODULOS)) LIBERADO[c.id] = c;

export const TODAS: Secao[] = (SECOES.secoes as Secao[]).map((s) => ({
  id: s.id, pai: s.pai, fase: s.fase, abre: s.abre, modelo: s.modelo, contagem: s.contagem,
}));
export const PRINCIPAIS = TODAS.filter((s) => !s.pai);
export const filhas = (id: string) => TODAS.filter((s) => s.pai === id);
export const secao = (id: string) => TODAS.find((s) => s.id === id);
export const abreMs = (s: Secao) => Date.parse(s.abre);

function lerSessao(chave: string): string | null {
  try {
    return sessionStorage.getItem(chave);
  } catch {
    return null;
  }
}
export function chaveAceita(id: string): string | null {
  return lerSessao(CHAVES.trava + id);
}
export function guardaChave(id: string, valor: string) {
  try {
    sessionStorage.setItem(CHAVES.trava + id, valor);
  } catch {
    /* sem armazenamento: vale só até recarregar */
  }
}

export function estadoDe(s: Secao, ms: number, destravadas: Record<string, string> = {}): Estado {
  const c = LIBERADO[s.id];
  if (c) {
    if (s.modelo === "data+resposta" && !(destravadas[s.id] || chaveAceita(s.id))) return "chave";
    return "aberta";
  }
  return ms >= abreMs(s) ? "sincronizando" : "reconectando";
}

/** Relógio de 1 s (hora confiável) para contagens e viradas de estado. */
export function useAgora(passoMs = 1000): number {
  const [t, setT] = useState(() => agora());
  useEffect(() => {
    const id = window.setInterval(() => setT(agora()), passoMs);
    return () => window.clearInterval(id);
  }, [passoMs]);
  return t;
}

/** Enquanto houver seção "sincronizando", consulta liberadas.json a cada 60 s
 *  e recarrega a página quando alguma delas aparece no build publicado. */
export function useSincroniza(pendentes: string[]) {
  const chave = pendentes.join(",");
  useEffect(() => {
    if (!chave) return;
    const ids = chave.split(",");
    let vivo = true;
    const consulta = async () => {
      try {
        const r = await fetch(`${import.meta.env.BASE_URL}liberadas.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const { ids: publicadas } = (await r.json()) as { ids?: string[] };
        if (vivo && publicadas && ids.some((id) => publicadas.includes(id))) window.location.reload();
      } catch {
        /* sem rede: tenta de novo no próximo ciclo */
      }
    };
    void consulta();
    const id = window.setInterval(consulta, 60_000);
    return () => {
      vivo = false;
      window.clearInterval(id);
    };
  }, [chave]);
}

const z2 = (n: number) => String(n).padStart(2, "0");
/** "12/12 · 20:00" em America/Sao_Paulo. */
export function dataCurta(ms: number) {
  const d = new Date(ms - 3 * 3600_000);
  return `${z2(d.getUTCDate())}/${z2(d.getUTCMonth() + 1)} · ${z2(d.getUTCHours())}:${z2(d.getUTCMinutes())}`;
}
/** "02d 14h 09m" (ou "14h 09m 05s" na última hora). */
export function contagem(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60;
  if (d > 0) return `${z2(d)}d ${z2(h)}h ${z2(m)}m`;
  return `${z2(h)}h ${z2(m)}m ${z2(s % 60)}s`;
}
export function horaSPTexto(ms: number, comSeg = false) {
  const d = new Date(ms - 3 * 3600_000);
  return `${z2(d.getUTCHours())}:${z2(d.getUTCMinutes())}${comSeg ? ":" + z2(d.getUTCSeconds()) : ""}`;
}
export function dataSPTexto(ms: number) {
  const d = new Date(ms - 3 * 3600_000);
  return `${z2(d.getUTCDate())}/${z2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}
