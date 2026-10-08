// ============================================================================
// EVENTOS RAROS DO TERMINAL — no máximo um por vez
// ============================================================================
// A abelha (components/AbelhaRara.tsx) e o chat do terminal
// (components/ChatWidget.tsx) reservam a vez aqui: a abelha do sorteio até
// sair da tela, o chat enquanto a janela estiver aberta. A Interceptação tem
// trava própria (estadoInterceptacao), respeitada pela abelha; ela fecha o
// chat ao abrir.

const ocupados = new Set<string>();

/** Reserva a vez para `id`. false = outro evento já está com ela. */
export function reservaEvento(id: string): boolean {
  if (outroEvento(id)) return false;
  ocupados.add(id);
  return true;
}

export function liberaEvento(id: string) {
  ocupados.delete(id);
}

/** Algum evento que não `id` está sorteado ou na tela? */
export function outroEvento(id: string): boolean {
  for (const o of ocupados) if (o !== id) return true;
  return false;
}
