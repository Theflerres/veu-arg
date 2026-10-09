import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { SIGLA_SAUDACAO } from "../app/bott-data";
import { InspectViewer } from "../inspect/InspectViewer";
import type { ConfigPoses } from "../inspect/poser";
import {
  ABAS,
  GRUPO_OBJETOS,
  GRUPO_ROSTO,
  GRUPOS_PES,
  NOS_GRUPO,
  OBJETOS,
  PRIORIDADE_ROSTO,
  RESPIRACAO,
  ROSTOS,
  ROSTO_POR_ESTADO,
  type EstadoRosto,
} from "../inspect/poses";
import { CORPO, LABEL, VERDE } from "./estilo";
import { Painel } from "./paineis";
import type { FaseReinicio } from "./Reinicio";
import { devolve, empresta, type IdPainel } from "./vitrine";

// ============================================================================
// MODO DE INSPEÇÃO DO HUB
// ============================================================================
// Carregado sob demanda (import dinâmico no BottHub): é aqui que entram o
// viewer e o three.js. Poses, câmeras e rostos de cada aba vêm de
// src/inspect/poses.ts; o painel lateral de cada aba mostra os painéis do
// próprio hub, pegos emprestados da HUD (vitrine.ts) — os mesmos, sem duplicar.

const POSES: ConfigPoses = {
  grupos: NOS_GRUPO,
  gruposPes: GRUPOS_PES,
  respiracao: RESPIRACAO,
  grupoRosto: GRUPO_ROSTO,
  rostos: ROSTOS,
  grupoObjetos: GRUPO_OBJETOS,
  objetos: OBJETOS,
};

/** Painéis do hub em cada aba (id da aba em poses.ts), pela ordem. "saudacao" é o único que não vem da HUD. */
export const PAINEIS_DA_ABA: Record<string, (IdPainel | "saudacao")[]> = {
  "aba-1": ["tempo", "controle", "saudacao", "pensamento", "fala"],
  "aba-2": ["diagnostico"],
  "aba-3": ["log"],
  "aba-4": ["checklist"],
};
/** Largura da coluna de painéis no desktop (px). */
export const LARGURA_PAINEIS = 420;

/** Aba com a barra de progresso: a cena do 99% pula para ela. */
const ABA_DA_BARRA = Math.max(0, ABAS.findIndex((a) => PAINEIS_DA_ABA[a.id]?.includes("diagnostico")));

const CSS_INSPECAO = `
.bi-camada .iv-painel.livre{color:${VERDE};font-family:${CORPO}}
.bi-camada .bh-painel{padding:12px 14px 14px}
.bi-camada .bh-tempo{height:92px!important}
.bi-camada .bh-tempo-num{font-size:clamp(46px,6vw,76px)!important}
.bi-camada .bh-tempo-uni{font-size:26px!important}
.bi-controle{padding:8px 14px;border:1px solid rgba(0,255,102,.26);background:rgba(2,9,5,.86);font-family:${LABEL};letter-spacing:.12em}
.bi-saudacao{font-size:13px;line-height:1.6}
@media (max-width:640px){
  .bi-camada .bh-tempo{height:60px!important}
  .bi-camada .bh-tempo-num{font-size:44px!important}
  .bi-camada .bh-tempo-uni{font-size:20px!important}
}
`;

export interface PropsInspecao {
  url: string;
  /** Primeira abertura do modo nesta visita: rosto tímido por um instante. */
  primeiraVez: boolean;
  escorregando: boolean;
  cena99: boolean;
  faseReinicio: FaseReinicio | null;
  /** Intensidade do âmbar vazando por baixo do verde (variável --vaza da HUD). */
  vaza: number;
  onVoltar: () => void;
  /** A aba PERFIL abriu (o TEMPO LIGADA buga de novo). */
  onAbaPerfil: () => void;
}

export default function Inspecao({
  url,
  primeiraVez,
  escorregando,
  cena99,
  faseReinicio,
  vaza,
  onVoltar,
  onAbaPerfil,
}: PropsInspecao) {
  // Rosto por estado do hub (ROSTO_POR_ESTADO em poses.ts). O tímido da
  // primeira abertura conta a partir do modelo pronto (antes disso não se vê).
  const [abrindo, setAbrindo] = useState(primeiraVez);
  const [pronto, setPronto] = useState(false);
  const onPronto = useCallback(() => setPronto(true), []);
  useEffect(() => {
    if (!abrindo || !pronto) return;
    const t = setTimeout(() => setAbrindo(false), ROSTO_POR_ESTADO.abertura.ms ?? 1500);
    return () => clearTimeout(t);
  }, [abrindo, pronto]);
  const ativos: Record<EstadoRosto, boolean> = {
    cena99,
    sinalInstavel: faseReinicio === "sinal",
    reiniciando: faseReinicio === "preto" || faseReinicio === "reiniciando",
    deslize: escorregando,
    abertura: abrindo,
  };
  const estado = PRIORIDADE_ROSTO.find((e) => ativos[e]);
  const sobreposicao = useMemo(
    () => (estado ? { rosto: ROSTO_POR_ESTADO[estado].rosto, contraluz: ROSTO_POR_ESTADO[estado].contraluz } : null),
    [estado]
  );

  // Cena do 99%: pula para a aba da barra, onde a frase aparece.
  const [irParaAba, setIrParaAba] = useState({ indice: ABA_DA_BARRA, n: 0 });
  useEffect(() => {
    if (cena99) setIrParaAba((a) => ({ indice: ABA_DA_BARRA, n: a.n + 1 }));
  }, [cena99]);

  const onAbaPerfilRef = useRef(onAbaPerfil);
  onAbaPerfilRef.current = onAbaPerfil;
  const onAba = useCallback((i: number) => {
    if (PAINEIS_DA_ABA[ABAS[i]?.id]?.includes("tempo")) onAbaPerfilRef.current();
  }, []);

  const renderPainel = useCallback(
    (aba: (typeof ABAS)[number]) => <PaineisDaAba ids={PAINEIS_DA_ABA[aba.id] ?? []} />,
    []
  );

  return (
    <div className="bi-camada" style={{ ["--vaza" as string]: vaza } as CSSProperties}>
      <style>{CSS_INSPECAO}</style>
      <InspectViewer
        url={url}
        abas={ABAS}
        opcoes={{ rotacaoInicialY: Math.PI, poses: POSES }}
        titulo="BOTT"
        subtitulo="MODO INSPEÇÃO"
        nomeCaptura="bott"
        larguraLado={LARGURA_PAINEIS}
        renderPainel={renderPainel}
        onVoltar={onVoltar}
        onAba={onAba}
        irParaAba={irParaAba}
        sobreposicao={sobreposicao}
        onPronto={onPronto}
      />
    </div>
  );
}

function PaineisDaAba({ ids }: { ids: (IdPainel | "saudacao")[] }) {
  return (
    <>
      {ids.map((id) => {
        if (id === "saudacao") {
          return (
            <Painel key={id} titulo="SAUDAÇÃO">
              <div className="bh-verde bi-saudacao">{SIGLA_SAUDACAO}</div>
            </Painel>
          );
        }
        if (id === "controle") {
          return (
            <div key={id} className="bi-controle">
              <Emprestimo id={id} />
            </div>
          );
        }
        return <Emprestimo key={id} id={id} />;
      })}
    </>
  );
}

/** Pendura aqui a caixa do painel da HUD enquanto estiver montado. */
function Emprestimo({ id }: { id: IdPainel }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    empresta(id, el);
    return () => devolve(id, el);
  }, [id]);
  return <div ref={ref} style={{ display: "contents" }} />;
}
