import { useEffect, useRef, useState } from "react";
import type { PropsEditor } from "./InspectViewer";
import {
  GRUPOS_POSE,
  LIMITES,
  OBJETOS,
  ROSTOS,
  validaEstadoPose,
  type AbaInspect,
  type CameraAba,
  type EstadoPose,
  type GrupoPose,
  type IdObjeto,
  type IdRosto,
  type Pose,
  type Vec3,
} from "./poses";

// Editor de poses — SÓ EM DEV (página de inspeção com ?editor=1). A página
// carrega este arquivo com import() dentro de `import.meta.env.DEV`, então ele
// não entra no build; a marca abaixo é barrada por scripts/check-debug-leaks.js
// caso um dia vaze.
const MARCA = "editor-poses-teste";
const EIXOS = ["X", "Y", "Z"] as const;

const estadoDe = (aba: AbaInspect | undefined): EstadoPose => ({
  pose: structuredClone(aba?.pose ?? {}),
  rosto: aba?.rosto ?? "padrao",
  objeto: aba?.objeto ?? "nenhum",
});

/** Tira grupos zerados e arredonda, para o JSON ficar curto. */
function limpaPose(pose: Pose): Pose {
  const saida: Pose = {};
  const arr = (v: Vec3) => v.map((n) => Math.round(n * 1000) / 1000) as Vec3;
  for (const g of GRUPOS_POSE) {
    const p = pose[g];
    if (!p) continue;
    const rot = p.rot && p.rot.some((n) => n !== 0) ? arr(p.rot) : undefined;
    const pos = p.pos && p.pos.some((n) => n !== 0) ? arr(p.pos) : undefined;
    if (rot || pos) saida[g] = { ...(rot && { rot }), ...(pos && { pos }) };
  }
  return saida;
}

export default function EditorPoses({ api }: PropsEditor) {
  const aba = api.abas[api.indice];
  const [estado, setEstado] = useState<EstadoPose>(() => estadoDe(aba));
  const [camera, setCamera] = useState<CameraAba | null>(null);
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState("");
  const [aberto, setAberto] = useState(true);
  const [grupoAberto, setGrupoAberto] = useState<GrupoPose | null>("head");

  // O api muda a cada render do visualizador; o efeito de montagem usa a versão mais recente.
  const apiRef = useRef(api);
  apiRef.current = api;
  useEffect(() => {
    apiRef.current.setEditando(true);
    return () => apiRef.current.setEditando(false);
  }, []);

  // Trocou de aba: o editor passa a editar a pose dela.
  useEffect(() => {
    setEstado(estadoDe(apiRef.current.abas[apiRef.current.indice]));
    setCamera(null);
    setAviso("");
  }, [aba?.id]);

  const muda = (novo: EstadoPose) => {
    setEstado(novo);
    api.aplicarAoVivo(novo);
  };

  const mudaRot = (g: GrupoPose, eixo: number, valor: number) => {
    const rot = [...(estado.pose[g]?.rot ?? [0, 0, 0])] as Vec3;
    rot[eixo] = valor;
    muda({ ...estado, pose: { ...estado.pose, [g]: { ...estado.pose[g], rot } } });
  };

  const zeraGrupo = (g: GrupoPose) => {
    const pose = { ...estado.pose };
    delete pose[g];
    muda({ ...estado, pose });
  };

  const copiar = async () => {
    const json = JSON.stringify({ ...estado, pose: limpaPose(estado.pose) }, null, 2);
    setTexto(json);
    try {
      await navigator.clipboard.writeText(json);
      setAviso("pose copiada para a área de transferência");
    } catch {
      setAviso("sem acesso à área de transferência: copie do campo abaixo");
    }
  };

  const colar = async () => {
    let bruto = texto.trim();
    if (!bruto) {
      try {
        bruto = (await navigator.clipboard.readText()).trim();
      } catch {
        setAviso("cole o JSON no campo abaixo e clique de novo");
        return;
      }
    }
    let dado: unknown;
    try {
      dado = JSON.parse(bruto);
    } catch {
      setAviso("JSON inválido");
      return;
    }
    const r = validaEstadoPose(dado);
    if (typeof r === "string") {
      setAviso(`erro: ${r}`);
      return;
    }
    muda(r);
    setAviso("pose colada (presa aos limites)");
  };

  const usarCamera = () => {
    const c = api.lerCamera();
    if (!c) return;
    setCamera(c);
    setAviso(`câmera capturada: alvo ${c.alvoY} · dist ${c.distancia} · elev ${c.elevacao}° · giro ${c.giro}° · fov ${c.fov}°`);
  };

  const salvar = () => {
    const nova = api.salvarNaAba({
      pose: limpaPose(estado.pose),
      rosto: estado.rosto,
      objeto: estado.objeto,
      ...(camera && { camera }),
    });
    if (!nova) return;
    setTexto(JSON.stringify(nova, null, 2));
    setCamera(null);
    setAviso(`salvo em "${nova.rotulo}" (só em memória) — cole o JSON abaixo em ABAS, em poses.ts`);
  };

  return (
    <div className={`ep-raiz${aberto ? "" : " fechado"}`} data-marca={MARCA}>
      <style>{CSS_EDITOR}</style>
      <div className="ep-topo">
        <strong>EDITOR DE POSES</strong>
        <span>{aba?.rotulo}</span>
        <button type="button" onClick={() => setAberto((v) => !v)}>
          {aberto ? "—" : "+"}
        </button>
      </div>

      {aberto && (
        <div className="ep-corpo">
          <label className="ep-linha">
            ROSTO
            <select value={estado.rosto} onChange={(e) => muda({ ...estado, rosto: e.target.value as IdRosto })}>
              {Object.entries(ROSTOS).map(([id, r]) => (
                <option key={id} value={id}>
                  {r.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="ep-linha">
            NA MÃO
            <select value={estado.objeto} onChange={(e) => muda({ ...estado, objeto: e.target.value as IdObjeto })}>
              {Object.entries(OBJETOS).map(([id, o]) => (
                <option key={id} value={id}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </label>

          {GRUPOS_POSE.map((g) => {
            const rot = estado.pose[g]?.rot ?? [0, 0, 0];
            const expandido = grupoAberto === g;
            return (
              <div key={g} className={`ep-grupo${expandido ? " aberto" : ""}`}>
                <button type="button" className="ep-grupo-topo" onClick={() => setGrupoAberto(expandido ? null : g)}>
                  <span>{g}</span>
                  <small>{rot.map((v) => Math.round(v)).join(" · ")}</small>
                </button>
                {expandido && (
                  <div className="ep-sliders">
                    {EIXOS.map((eixo, i) => {
                      const [min, max] = LIMITES[g].rot[i];
                      return (
                        <label key={eixo} className="ep-slider">
                          <span>{eixo}</span>
                          <input
                            type="range"
                            min={min}
                            max={max}
                            step={1}
                            value={rot[i]}
                            onChange={(e) => mudaRot(g, i, Number(e.target.value))}
                          />
                          <output>{Math.round(rot[i])}°</output>
                        </label>
                      );
                    })}
                    <button type="button" className="ep-mini" onClick={() => zeraGrupo(g)}>
                      zerar {g}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <div className="ep-botoes">
            <button type="button" onClick={copiar}>copiar pose como JSON</button>
            <button type="button" onClick={colar}>colar pose</button>
            <button type="button" onClick={usarCamera} aria-pressed={!!camera}>
              usar a câmera atual como enquadramento desta aba
            </button>
            <button type="button" className="ep-salvar" onClick={salvar}>
              salvar na aba selecionada
            </button>
          </div>
          {aviso && <div className="ep-aviso">{aviso}</div>}
          <textarea
            className="ep-json"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="JSON da pose / da aba aparece aqui (cole aqui para 'colar pose')"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}

const CSS_EDITOR = `
.ep-raiz{position:absolute;z-index:6;left:12px;top:12px;bottom:12px;width:300px;display:flex;flex-direction:column;background:rgba(10,6,2,.93);border:1px solid rgba(255,210,63,.35);color:#ffd23f;font:11px/1.4 'JetBrains Mono',monospace;pointer-events:auto;touch-action:auto;user-select:text;-webkit-user-select:text}
.ep-raiz.fechado{bottom:auto}
.ep-topo{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid rgba(255,210,63,.2);font-family:'Share Tech Mono',monospace;letter-spacing:.16em}
.ep-topo span{flex:1;color:rgba(255,210,63,.55)}
.ep-topo button,.ep-botoes button,.ep-mini,.ep-grupo-topo{font:inherit;color:inherit;background:rgba(255,210,63,.06);border:1px solid rgba(255,210,63,.3);cursor:pointer}
.ep-topo button{width:24px;height:22px}
.ep-corpo{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px}
.ep-linha{display:flex;align-items:center;justify-content:space-between;gap:8px;font-family:'Share Tech Mono',monospace;letter-spacing:.14em;color:rgba(255,210,63,.7)}
.ep-linha select{flex:1;max-width:170px;font:inherit;color:#ffd23f;background:#140c03;border:1px solid rgba(255,210,63,.3);padding:3px}
.ep-grupo{border:1px solid rgba(255,210,63,.14)}
.ep-grupo.aberto{border-color:rgba(255,210,63,.4)}
.ep-grupo-topo{width:100%;display:flex;justify-content:space-between;padding:5px 8px;border:0;background:none;text-align:left}
.ep-grupo-topo small{color:rgba(255,210,63,.5)}
.ep-sliders{padding:4px 8px 8px;display:grid;gap:4px}
.ep-slider{display:grid;grid-template-columns:14px 1fr 44px;align-items:center;gap:6px}
.ep-slider input{width:100%;accent-color:#ffd23f}
.ep-slider output{text-align:right;color:rgba(255,210,63,.85)}
.ep-mini{justify-self:end;padding:2px 8px;font-size:10px}
.ep-botoes{display:grid;gap:5px;margin-top:4px}
.ep-botoes button{padding:6px 8px;text-align:left}
.ep-botoes button[aria-pressed="true"]{background:rgba(255,210,63,.2)}
.ep-botoes .ep-salvar{background:#ffd23f;color:#140c03;border-color:#ffd23f}
.ep-aviso{padding:6px 8px;border-left:2px solid #ffd23f;background:rgba(255,210,63,.08);color:rgba(255,210,63,.9);word-break:break-word}
.ep-json{min-height:140px;resize:vertical;font:10px/1.5 'JetBrains Mono',monospace;color:#ffd23f;background:#0b0703;border:1px solid rgba(255,210,63,.25);padding:6px}
@media (max-width:640px){
  .ep-raiz{right:12px;width:auto;bottom:auto;max-height:46vh}
}
`;
