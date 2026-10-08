// Paleta e CSS do hub da Bott. Verde fósforo = P3 no controle; âmbar/mel
// fica reservado para os deslizes e "vaza" por baixo do verde (text-shadow
// âmbar deslocado sob o texto verde, intensidade em --vaza).

export const VERDE = "#00FF66";
export const VERDE_MID = "#2BEA7B";
export const VERDE_DIM = "#0A3B23";
export const VERDE_APAGADO = "rgba(0,255,102,0.45)";
export const AMBAR = "#FFB000";
export const VERMELHO = "#FF3B3B";
export const FUNDO = "#020503";

export const DISPLAY = "'VT323',monospace";
export const LABEL = "'Share Tech Mono',monospace";
export const CORPO = "'JetBrains Mono','Share Tech Mono',monospace";

const FAVO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100' fill='none' stroke='%2300FF66' stroke-opacity='0.075'/%3E%3Cpath d='M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34' fill='none' stroke='%2300FF66' stroke-opacity='0.04'/%3E%3C/svg%3E\")";

const GRAO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.09'/%3E%3C/svg%3E\")";

/** Polígono de hexágono "deitado" para clip-path. */
export const HEX_CLIP = "polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%)";

export const CSS = `
html,body{margin:0;height:100%;background:${FUNDO}}
*{box-sizing:border-box}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-thumb{background:rgba(0,255,102,.18)}
::selection{background:rgba(255,176,0,.35);color:#fff}

@keyframes bh-pisca{0%,100%{opacity:1}50%{opacity:0}}
@keyframes bh-flicker{0%,97%,100%{opacity:1}92%{opacity:.97}93%{opacity:.93}96%{opacity:.98}}
@keyframes bh-scanroll{0%{transform:translateY(0)}100%{transform:translateY(4px)}}
@keyframes bh-entra{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes bh-respira{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes bh-falha{0%,100%{transform:none;filter:none}20%{transform:translate(-3px,1px) skewX(-4deg);filter:drop-shadow(3px 0 rgba(255,176,0,.7)) drop-shadow(-3px 0 rgba(0,229,255,.5))}40%{transform:translate(2px,-1px);clip-path:inset(10% 0 40% 0)}60%{transform:translate(-1px,0);clip-path:inset(55% 0 5% 0)}80%{transform:translate(1px,1px);clip-path:none}}
@keyframes bh-sobrescreve{0%{filter:none;transform:none}25%{filter:drop-shadow(4px 0 ${AMBAR}) drop-shadow(-4px 0 #00E5FF);transform:translateX(-3px) skewX(8deg)}50%{transform:translateX(4px);opacity:.6}75%{transform:translateX(-2px) skewX(-6deg);opacity:.9}100%{filter:none;transform:none;opacity:1}}
@keyframes bh-vaza{0%,100%{opacity:.75}50%{opacity:1}}

.bh-raiz{position:fixed;inset:0;overflow-y:auto;overflow-x:hidden;background:${FUNDO};color:${VERDE};font-family:${CORPO};--vaza:.22}
.bh-favo{position:fixed;inset:0;pointer-events:none;background-image:${FAVO};background-size:56px 100px;-webkit-mask-image:radial-gradient(ellipse at 50% 40%,#000 0%,rgba(0,0,0,.5) 55%,transparent 100%);mask-image:radial-gradient(ellipse at 50% 40%,#000 0%,rgba(0,0,0,.5) 55%,transparent 100%)}
.bh-brilho{position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 30%,rgba(0,255,102,.07) 0%,transparent 60%)}
.bh-mel{position:fixed;left:0;right:0;bottom:0;height:45vh;pointer-events:none;background:linear-gradient(to top,rgba(255,176,0,.10),transparent);opacity:calc(var(--vaza) * 2.2);transition:opacity 1.2s ease}

.bh-crt-grao{position:fixed;inset:0;pointer-events:none;z-index:950;mix-blend-mode:overlay;opacity:.5;background-image:${GRAO};background-size:240px 240px}
.bh-crt-linhas{position:fixed;inset:-4px 0 0 0;pointer-events:none;z-index:951;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 2px,rgba(0,0,0,.16) 2px,rgba(0,0,0,.16) 4px);animation:bh-scanroll .13s linear infinite}
.bh-crt-vinheta{position:fixed;inset:0;pointer-events:none;z-index:952;background:radial-gradient(ellipse at 50% 50%,transparent 40%,rgba(0,0,0,.35) 75%,rgba(0,0,0,.75) 100%)}
.bh-crt-flicker{position:fixed;inset:0;pointer-events:none;z-index:953;animation:bh-flicker 9s linear infinite}

.bh-verde{color:${VERDE};text-shadow:0 0 8px rgba(0,255,102,.45),0 2px 0 rgba(255,176,0,var(--vaza))}
.bh-ambar{color:${AMBAR};text-shadow:0 0 10px rgba(255,176,0,.6),0 0 22px rgba(255,176,0,.25)}

.bh-conteudo{position:relative;z-index:2;max-width:1180px;margin:0 auto;padding:0 16px 56px}
.bh-topo{position:sticky;top:0;z-index:10;display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;padding:10px 16px;background:rgba(2,5,3,.94);border-bottom:1px solid rgba(0,255,102,.22);font-family:${LABEL};letter-spacing:.12em}
.bh-grade{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px;margin-top:20px}
.bh-c5{grid-column:span 5}.bh-c7{grid-column:span 7}.bh-c6{grid-column:span 6}.bh-c12{grid-column:span 12}
.bh-pilha{display:flex;flex-direction:column;gap:16px;min-width:0}
@media (max-width:860px){.bh-c5,.bh-c7,.bh-c6{grid-column:span 12}}

.bh-painel{position:relative;background:rgba(2,9,5,.86);border:1px solid rgba(0,255,102,.26);box-shadow:inset 0 0 40px rgba(0,0,0,.6),0 0 18px rgba(0,255,102,.05);padding:14px 16px 16px;min-width:0;animation:bh-entra .5s ease-out both;transition:box-shadow .6s ease,border-color .6s ease}
.bh-painel::after{content:"";position:absolute;inset:auto 0 0 0;height:60%;pointer-events:none;background:linear-gradient(to top,rgba(255,176,0,.13),transparent);opacity:0;transition:opacity .8s ease}
.bh-painel.bh-escorrega{border-color:rgba(255,176,0,.45);box-shadow:inset 0 0 40px rgba(0,0,0,.6),0 0 22px rgba(255,176,0,.16)}
.bh-painel.bh-escorrega::after{opacity:1;animation:bh-vaza 1.4s ease-in-out infinite}
.bh-painel.bh-falhando{animation:bh-falha .28s steps(2) 1}
.bh-titulo{display:flex;align-items:center;gap:8px;font-family:${LABEL};font-size:10px;letter-spacing:.22em;color:${VERDE_MID};margin-bottom:12px}
.bh-titulo::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(0,255,102,.3),transparent)}
.bh-hex{display:inline-block;width:9px;height:8px;background:${VERDE};clip-path:${HEX_CLIP};box-shadow:0 0 6px ${VERDE}}

.bh-sobrescreve{animation:bh-sobrescreve .3s steps(3) infinite}
.bh-pular{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);font-family:${LABEL};font-size:10px;letter-spacing:.24em;color:rgba(0,255,102,.35);animation:bh-respira 2.4s ease-in-out infinite;z-index:3;white-space:nowrap}
.bh-voltar{font-family:${LABEL};font-size:10px;letter-spacing:.18em;color:rgba(0,255,102,.3);background:none;border:none;padding:6px;cursor:pointer;text-decoration:none;transition:color .2s ease}
.bh-voltar:hover,.bh-voltar:focus-visible{color:rgba(0,255,102,.75)}
`;
