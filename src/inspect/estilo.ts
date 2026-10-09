import { COR_FUNDO, COR_MEL, COR_VERDE } from "./cores";

// CSS do InspectViewer. Prefixo iv- para não colidir com o resto do site
// quando o componente for montado em outra página.

const DISPLAY = "'VT323',monospace";
const LABEL = "'Share Tech Mono',monospace";
const MEL_A = (a: number) => `rgba(255,210,63,${a})`;

const HEX = "polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%)";
const CHANFRO = "polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px)";

export const CSS_INSPECT = `
@keyframes iv-gira{to{transform:rotate(360deg)}}
@keyframes iv-respira{0%,100%{opacity:.35}50%{opacity:.8}}
@keyframes iv-varre{from{transform:translateY(-10vh)}to{transform:translateY(110vh)}}
@keyframes iv-treme{0%,100%{transform:none}25%{transform:translateX(-6px) skewX(-3deg)}50%{transform:translateX(5px)}75%{transform:translateX(-2px) skewX(2deg)}}
@keyframes iv-fatias{0%{clip-path:inset(12% 0 80% 0)}33%{clip-path:inset(58% 0 30% 0)}66%{clip-path:inset(30% 0 62% 0)}100%{clip-path:inset(78% 0 12% 0)}}

.iv-raiz{position:relative;width:100%;height:100%;overflow:hidden;background:${COR_FUNDO};color:${COR_MEL};user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;touch-action:none}
.iv-palco{position:absolute;inset:0}
.iv-palco canvas{cursor:grab}
.iv-raiz.iv-arrastando .iv-palco canvas{cursor:grabbing}
.iv-raiz.iv-glitch .iv-palco{animation:iv-treme .2s steps(4) 1}

.iv-hud{position:absolute;inset:0;pointer-events:none;transition:opacity .35s ease}
.iv-raiz.iv-sem-ui .iv-hud{opacity:0}
.iv-raiz.iv-sem-ui .iv-hud *{pointer-events:none !important}

.iv-moldura{position:absolute;inset:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));border:1px solid ${MEL_A(0.1)}}
.iv-canto{position:absolute;width:18px;height:18px;border:0 solid ${MEL_A(0.75)}}
.iv-canto.a{top:-1px;left:-1px;border-top-width:1px;border-left-width:1px}
.iv-canto.b{top:-1px;right:-1px;border-top-width:1px;border-right-width:1px}
.iv-canto.c{bottom:-1px;left:-1px;border-bottom-width:1px;border-left-width:1px}
.iv-canto.d{bottom:-1px;right:-1px;border-bottom-width:1px;border-right-width:1px}
.iv-marcas{position:absolute;top:50%;width:6px;height:120px;transform:translateY(-50%);background:repeating-linear-gradient(to bottom,${MEL_A(0.35)} 0 1px,transparent 1px 12px)}
.iv-marcas.e{left:-1px}.iv-marcas.dir{right:-1px}

.iv-topo{position:absolute;top:18px;left:20px;display:flex;flex-direction:column;gap:2px}
.iv-titulo{font-family:${DISPLAY};font-size:32px;line-height:1;letter-spacing:.06em;color:${COR_MEL};text-shadow:0 0 10px ${MEL_A(0.55)},0 0 24px ${MEL_A(0.2)}}
.iv-titulo b{font-weight:normal;color:${MEL_A(0.45)}}
.iv-sub{font-family:${LABEL};font-size:10px;letter-spacing:.3em;color:${MEL_A(0.45)}}
.iv-hex{display:inline-block;width:8px;height:7px;margin-right:7px;background:${COR_MEL};clip-path:${HEX};box-shadow:0 0 6px ${COR_MEL};animation:iv-respira 2.6s ease-in-out infinite}

.iv-leitura{position:absolute;top:20px;right:20px;display:grid;grid-template-columns:auto auto;gap:3px 12px;font-family:${LABEL};font-size:11px;letter-spacing:.16em;color:${MEL_A(0.4)};text-align:right}
.iv-leitura span:nth-child(even){color:${MEL_A(0.85)};min-width:5ch}

.iv-regua{position:absolute;left:50%;bottom:22px;width:min(320px,46%);height:22px;transform:translateX(-50%);-webkit-mask-image:linear-gradient(90deg,transparent,#000 25%,#000 75%,transparent);mask-image:linear-gradient(90deg,transparent,#000 25%,#000 75%,transparent)}
.iv-regua-fita{position:absolute;inset:0 -200px;background:repeating-linear-gradient(90deg,${MEL_A(0.5)} 0 1px,transparent 1px 10px),repeating-linear-gradient(90deg,${MEL_A(0.9)} 0 1px,transparent 1px 50px);background-size:100% 6px,100% 11px;background-repeat:repeat-x;background-position:0 100%,0 100%}
.iv-regua::after{content:"";position:absolute;left:50%;bottom:0;width:1px;height:20px;background:${COR_MEL};box-shadow:0 0 6px ${COR_MEL}}

.iv-dica{position:absolute;left:20px;bottom:20px;font-family:${LABEL};font-size:10px;letter-spacing:.2em;line-height:1.7;color:${MEL_A(0.32)}}
.iv-dica kbd{font:inherit;color:${MEL_A(0.65)}}

.iv-acoes{position:absolute;right:20px;bottom:18px;display:flex;gap:8px;pointer-events:auto}
.iv-botao{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 12px;border:1px solid ${MEL_A(0.38)};background:rgba(24,14,3,.62);color:${COR_MEL};font-family:${LABEL};font-size:11px;letter-spacing:.16em;cursor:pointer;clip-path:${CHANFRO};transition:background .15s ease,border-color .15s ease;-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
.iv-botao:hover{background:${MEL_A(0.12)};border-color:${MEL_A(0.7)}}
.iv-botao:disabled{opacity:.4;cursor:default}
.iv-botao:focus-visible{outline:1px solid ${COR_MEL};outline-offset:2px}
.iv-botao[aria-pressed="true"]{background:${MEL_A(0.2)};border-color:${COR_MEL};box-shadow:inset 0 0 12px ${MEL_A(0.25)}}
.iv-botao svg{width:15px;height:15px;flex:none}

.iv-reexibir{position:absolute;top:max(18px,env(safe-area-inset-top));right:max(18px,env(safe-area-inset-right));width:40px;height:40px;display:grid;place-items:center;border:1px solid ${MEL_A(0.4)};background:rgba(24,14,3,.5);color:${COR_MEL};cursor:pointer;clip-path:${CHANFRO};opacity:0;pointer-events:none;transition:opacity .4s ease}
.iv-reexibir.ativo{opacity:.6;pointer-events:auto}
.iv-reexibir svg{width:16px;height:16px}

.iv-centro .iv-botao{pointer-events:auto}
.iv-lento{justify-content:flex-start;padding-top:18vh}
.iv-lento span{padding:8px 12px;background:rgba(11,7,3,.88);border:1px solid ${MEL_A(0.3)}}
.iv-erro-hex{width:64px;height:64px;animation:iv-gira 2.4s linear infinite;filter:drop-shadow(0 0 8px ${MEL_A(0.6)})}
.iv-erro-msg{max-width:min(560px,92vw);white-space:pre-wrap;word-break:break-word;font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.02em;line-height:1.6;color:${MEL_A(0.85)};background:rgba(24,14,3,.7);border:1px solid ${MEL_A(0.3)};padding:12px 14px;text-align:left}

.iv-glitch-camada{position:absolute;inset:0;pointer-events:none;z-index:5;mix-blend-mode:screen}
.iv-glitch-camada::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(0,255,102,.32) 20%,rgba(0,255,102,.08) 60%,transparent);animation:iv-fatias .2s steps(1) 1 both}
.iv-glitch-camada::after{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:${COR_VERDE};box-shadow:0 0 14px ${COR_VERDE},0 0 40px rgba(0,255,102,.5);animation:iv-varre .22s linear 1 both}

/* abas + painel lateral */
.iv-lado{position:absolute;right:20px;top:50%;transform:translateY(-50%);width:min(var(--iv-lado-largura,340px),38vw);pointer-events:auto;touch-action:pan-y}
.iv-painel.livre{padding:0;background:none;border:0;clip-path:none;-webkit-backdrop-filter:none;backdrop-filter:none;max-height:calc(100vh - 190px);overflow-y:auto;display:flex;flex-direction:column;gap:10px}
.iv-abas{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:4px;margin-bottom:6px}
.iv-aba{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0;padding:7px 8px 8px;border:1px solid ${MEL_A(0.22)};background:rgba(24,14,3,.55);color:${MEL_A(0.55)};font-family:${LABEL};font-size:10px;letter-spacing:.06em;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;clip-path:${CHANFRO};transition:color .2s ease,background .2s ease,border-color .2s ease}
.iv-aba-num{font-size:9px;letter-spacing:.2em;color:${MEL_A(0.35)}}
.iv-aba:hover{color:${COR_MEL};border-color:${MEL_A(0.5)}}
.iv-aba:focus-visible{outline:1px solid ${COR_MEL};outline-offset:2px}
.iv-aba[aria-selected="true"]{color:#140c03;background:var(--iv-acento,${COR_MEL});border-color:var(--iv-acento,${COR_MEL})}
.iv-aba[aria-selected="true"] .iv-aba-num{color:rgba(20,12,3,.6)}
.iv-painel{position:relative;padding:12px 16px 14px;background:rgba(20,12,3,.74);border:1px solid ${MEL_A(0.22)};border-left:2px solid var(--iv-acento,${COR_MEL});clip-path:${CHANFRO};-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.iv-painel.dir{animation:iv-painel-dir .38s cubic-bezier(.2,.8,.2,1) both}
.iv-painel.esq{animation:iv-painel-esq .38s cubic-bezier(.2,.8,.2,1) both}
@keyframes iv-painel-dir{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}
@keyframes iv-painel-esq{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
.iv-painel-topo{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.iv-painel h2{flex:1;margin:0;font-family:${DISPLAY};font-weight:normal;font-size:21px;line-height:1;letter-spacing:.03em;color:var(--iv-acento,${COR_MEL});text-shadow:0 0 10px rgba(255,210,63,.25)}
.iv-seta{width:26px;height:26px;display:grid;place-items:center;border:1px solid ${MEL_A(0.3)};background:none;color:${COR_MEL};font-size:18px;line-height:1;cursor:pointer}
.iv-seta:hover{background:${MEL_A(0.12)}}
.iv-painel dl{margin:0 0 10px;display:grid;gap:5px}
.iv-painel dl div{display:flex;justify-content:space-between;gap:12px;padding-bottom:4px;border-bottom:1px dashed ${MEL_A(0.14)}}
.iv-painel dt{font-family:${LABEL};font-size:10px;letter-spacing:.18em;color:${MEL_A(0.45)}}
.iv-painel dd{margin:0;font-family:${LABEL};font-size:11px;letter-spacing:.1em;color:${MEL_A(0.9)};text-align:right}
.iv-painel p{margin:0;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.6;color:${MEL_A(0.55)}}

/* swoosh da troca de aba */
.iv-swoosh{position:absolute;inset:0;pointer-events:none;z-index:4;overflow:hidden}
.iv-swoosh-linhas{position:absolute;inset:0 -40%;opacity:0;mix-blend-mode:screen;background:repeating-linear-gradient(to bottom,transparent 0 11px,var(--iv-acento,${COR_MEL}) 11px 12px,transparent 12px 29px,${MEL_A(0.5)} 29px 30px,transparent 30px 47px);-webkit-mask-image:linear-gradient(90deg,transparent,#000 35%,#000 65%,transparent);mask-image:linear-gradient(90deg,transparent,#000 35%,#000 65%,transparent)}
.iv-swoosh.dir .iv-swoosh-linhas{animation:iv-linhas-dir .42s cubic-bezier(.2,.7,.2,1) both}
.iv-swoosh.esq .iv-swoosh-linhas{animation:iv-linhas-esq .42s cubic-bezier(.2,.7,.2,1) both}
@keyframes iv-linhas-dir{0%{transform:translateX(35%);opacity:0}25%{opacity:.32}100%{transform:translateX(-35%);opacity:0}}
@keyframes iv-linhas-esq{0%{transform:translateX(-35%);opacity:0}25%{opacity:.32}100%{transform:translateX(35%);opacity:0}}
.iv-swoosh-hex{position:absolute;left:50%;top:50%;width:46vmin;height:46vmin;margin:-23vmin 0 0 -23vmin;fill:rgba(255,210,63,.07);stroke:var(--iv-acento,${COR_MEL});stroke-width:1.2;vector-effect:non-scaling-stroke;mix-blend-mode:screen;animation:iv-hex-flash .45s ease-out both}
@keyframes iv-hex-flash{0%{transform:scale(.25) rotate(-20deg);opacity:0}20%{opacity:.9}100%{transform:scale(2.6) rotate(10deg);opacity:0}}

@media (max-width:640px){
  .iv-topo{top:16px;left:16px}
  .iv-titulo{font-size:24px}
  .iv-sub{font-size:9px;letter-spacing:.24em}
  .iv-leitura{top:18px;right:16px;font-size:10px;gap:2px 8px}
  .iv-leitura .iv-opcional{display:none}
  .iv-dica,.iv-regua,.iv-marcas{display:none}
  .iv-acoes{left:50%;right:auto;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%)}
  .iv-botao{width:44px;height:44px;padding:0;justify-content:center}
  .iv-botao span{display:none}
  .iv-botao svg{width:18px;height:18px}
  .iv-lado{left:16px;right:16px;top:auto;bottom:calc(max(18px,env(safe-area-inset-bottom)) + 54px);width:auto;transform:none}
  .iv-abas{display:flex;overflow-x:auto;scrollbar-width:none}
  .iv-abas::-webkit-scrollbar{display:none}
  .iv-aba{flex:1 0 auto;padding:6px 8px}
  .iv-painel{max-height:24vh;overflow-y:auto;padding:10px 12px}
  .iv-painel h2{font-size:20px}
  .iv-painel dl{gap:3px;margin-bottom:0}
  .iv-painel dl div{padding-bottom:2px}
  .iv-painel p{display:none}
  .iv-painel.livre{max-height:38vh;padding:0}
}
@media (prefers-reduced-motion:reduce){
  .iv-hex{animation:none}
  .iv-painel.dir,.iv-painel.esq{animation:iv-painel-fade .2s ease both}
  @keyframes iv-painel-fade{from{opacity:0}to{opacity:1}}
}
`;
