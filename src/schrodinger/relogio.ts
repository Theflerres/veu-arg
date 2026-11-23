// Hora do Sistema Schrödinger: a hora confiável (hora-confiavel.ts, âncora no
// servidor). Só no `npm run dev` dá para simular outra hora, pelo console:
// testeSchrodinger.agora("2026-12-19T20:00:00-03:00") — no build isso some.

import { agora } from "../app/hora-confiavel";

const T0 = performance.now();

export function agoraSch(): number {
  if (import.meta.env.DEV) {
    try {
      const v = localStorage.getItem("sch-agora-teste");
      if (v && !Number.isNaN(Date.parse(v))) return Date.parse(v) + (performance.now() - T0);
    } catch {
      /* ignore */
    }
  }
  return agora();
}
