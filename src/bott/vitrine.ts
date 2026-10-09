// ============================================================================
// VITRINE DOS PAINÉIS
// ============================================================================
// Cada painel do hub é renderizado UMA vez (portal) dentro de uma caixa DOM
// fixa, com `display: contents` (para a grade da HUD enxergar o painel como
// se a caixa não existisse). A caixa mora na vaga dela na HUD; o modo de
// inspeção pode pedi-la emprestada e pendurá-la no painel lateral dele, e
// ela volta para a vaga ao ser devolvida. Como o nó é movido, não remontado,
// o estado, os timers e a barra de progresso continuam os mesmos.

export type IdPainel = "tempo" | "controle" | "fala" | "pensamento" | "checklist" | "diagnostico" | "log";

const caixas = new Map<IdPainel, HTMLDivElement>();
const vagas = new Map<IdPainel, HTMLElement>();
const emprestimos = new Map<IdPainel, HTMLElement>();

/** Caixa do painel (criada na primeira chamada). */
export function caixa(id: IdPainel): HTMLDivElement {
  let c = caixas.get(id);
  if (!c) {
    c = document.createElement("div");
    c.style.display = "contents";
    c.dataset.painel = id;
    caixas.set(id, c);
  }
  return c;
}

function posiciona(id: IdPainel) {
  const alvo = emprestimos.get(id) ?? vagas.get(id);
  const c = caixa(id);
  if (alvo && c.parentNode !== alvo) alvo.appendChild(c);
}

/** A HUD registra (ou desfaz, com null) a vaga do painel. */
export function registraVaga(id: IdPainel, el: HTMLElement | null) {
  if (el) vagas.set(id, el);
  else vagas.delete(id);
  posiciona(id);
}

/** O modo de inspeção pendura o painel no elemento dele. */
export function empresta(id: IdPainel, el: HTMLElement) {
  emprestimos.set(id, el);
  posiciona(id);
}

/** Devolve o painel à vaga da HUD (só se o empréstimo ainda for daquele elemento). */
export function devolve(id: IdPainel, el: HTMLElement) {
  if (emprestimos.get(id) !== el) return;
  emprestimos.delete(id);
  posiciona(id);
}
