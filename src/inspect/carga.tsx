import { COR_MEL } from "./cores";

// Barra de carregamento em favo e o bloco centralizado das mensagens do
// inspetor. Sem three.js: o hub da Bott mostra esta barra enquanto o pedaço
// do inspetor (motor + three.js) ainda está baixando.

const FAVOS_CARGA = 12;
const MEL_A = (a: number) => `rgba(255,210,63,${a})`;
const HEX = "polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%)";

export const CSS_CARGA = `
@keyframes iv-onda{0%,100%{opacity:.18}50%{opacity:.9}}
.iv-centro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;pointer-events:none;font-family:'Share Tech Mono',monospace;letter-spacing:.2em;font-size:11px;color:${MEL_A(0.7)}}
.iv-favos{display:flex;gap:4px}
.iv-favos i{width:16px;height:14px;clip-path:${HEX};background:${MEL_A(0.12)};transition:background .2s ease,box-shadow .2s ease}
.iv-favos i.cheio{background:${COR_MEL};box-shadow:0 0 8px ${COR_MEL}}
.iv-favos.indeterminado i{animation:iv-onda 1.1s ease-in-out infinite;background:${COR_MEL}}
@media (prefers-reduced-motion:reduce){.iv-favos.indeterminado i{animation:none}}
`;

/** Barra em favo: `progresso` de 0 a 1, ou null para indeterminado. */
export function CargaFavo({ progresso, rotulo = "CARREGANDO MODELO" }: { progresso: number | null; rotulo?: string }) {
  const cheios = progresso === null ? 0 : Math.round(progresso * FAVOS_CARGA);
  return (
    <div className="iv-centro" role="status" aria-live="polite">
      <style>{CSS_CARGA}</style>
      <div className={`iv-favos${progresso === null ? " indeterminado" : ""}`}>
        {Array.from({ length: FAVOS_CARGA }, (_, i) => (
          <i
            key={i}
            className={i < cheios ? "cheio" : undefined}
            style={progresso === null ? { animationDelay: `${i * 0.08}s` } : undefined}
          />
        ))}
      </div>
      <span>
        {rotulo}
        {progresso === null ? "…" : ` ${Math.round(progresso * 100)}%`}
      </span>
    </div>
  );
}
