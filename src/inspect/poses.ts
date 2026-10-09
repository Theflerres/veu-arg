// Abas da inspeção 3D: cada aba define pose, rosto, objeto na mão, câmera,
// cor do contraluz, repouso e o painel lateral. Os valores iniciais foram
// ajustados no editor (página de inspeção com ?editor=1, só em DEV): ele
// gera o JSON de uma aba para colar aqui.
//
// Convenções (modelo de frente para a câmera):
//   rot  — graus, no espaço do pai do grupo, ordem XYZ.
//          X+ inclina para trás (cabeça olha para cima; braço vai para frente).
//          Z+ afasta o lado direito do corpo; Z− afasta o esquerdo.
//   pos  — deslocamento em unidades do modelo (a altura total é ~2,26).

export type Vec3 = [number, number, number];
export type Faixa = [min: number, max: number];

export const GRUPOS_POSE = [
  "head",
  "body",
  "left_arm",
  "right_arm",
  "left_leg",
  "right_leg",
  "asas",
  "antena",
  "xuxinhas",
  "objeto",
] as const;
export type GrupoPose = (typeof GRUPOS_POSE)[number];

export type PoseGrupo = { rot?: Vec3; pos?: Vec3 };
export type Pose = Partial<Record<GrupoPose, PoseGrupo>>;

/** Variantes de rosto: nós (dentro do grupo GRUPO_ROSTO) que ficam visíveis. */
export const ROSTOS = {
  padrao: { rotulo: "PADRÃO", nos: ["cube19", "cube20"] },
  happy: { rotulo: "FELIZ", nos: ["Happy"] },
  wifi: { rotulo: "WI-FI", nos: ["cube28"] },
  triste: { rotulo: "TRISTE", nos: ["Triste"] },
  bored: { rotulo: "ENTEDIADO", nos: ["Bored"] },
  bravo: { rotulo: "BRAVO", nos: ["Bravo"] },
  fechados: { rotulo: "OLHOS FECHADOS", nos: ["Fechados"] },
  who: { rotulo: "DÚVIDA", nos: ["Who"] },
  shy: { rotulo: "TÍMIDO", nos: ["MUITOSHY"] },
} as const satisfies Record<string, { rotulo: string; nos: readonly string[] }>;
export type IdRosto = keyof typeof ROSTOS;

/** Estados do hub da Bott que trocam o rosto (e às vezes o contraluz) por um
 *  tempo, por cima do rosto da aba. Quando mais de um vale, ganha o primeiro de
 *  PRIORIDADE_ROSTO. `ms` = duração fixa (os outros duram enquanto o estado durar). */
export type EstadoRosto = "cena99" | "sinalInstavel" | "reiniciando" | "deslize" | "abertura";
export const ROSTO_POR_ESTADO: Record<EstadoRosto, { rosto: IdRosto; contraluz?: string; ms?: number }> = {
  cena99: { rosto: "bravo", contraluz: "#ff2b2b" },
  sinalInstavel: { rosto: "wifi" },
  reiniciando: { rosto: "fechados" },
  deslize: { rosto: "who", contraluz: "#ff9a2e" },
  abertura: { rosto: "shy", ms: 1500 },
};
export const PRIORIDADE_ROSTO: EstadoRosto[] = ["cena99", "sinalInstavel", "reiniciando", "deslize", "abertura"];

/** Objetos na mão: nós (dentro de GRUPO_OBJETOS) que ficam visíveis. */
export const OBJETOS = {
  nenhum: { rotulo: "NENHUM", nos: [] },
  mic: { rotulo: "MIC", nos: ["Mic"] },
} as const satisfies Record<string, { rotulo: string; nos: readonly string[] }>;
export type IdObjeto = keyof typeof OBJETOS;

export type CameraAba = {
  /** Altura do alvo, em fração da altura do modelo (0 = pés, 1 = topo). */
  alvoY: number;
  /** Distância em múltiplos do enquadramento de corpo inteiro (1 = corpo inteiro). */
  distancia: number;
  /** Graus; negativo = câmera de baixo. */
  elevacao: number;
  /** Giro do modelo em graus a partir da frente (positivo = mostra o lado direito dele). */
  giro: number;
  /** Campo de visão vertical em graus (a distância compensa: muda a perspectiva, não o tamanho). */
  fov: number;
};

/** Movimento senoidal de repouso. rot em graus, pos em unidades do modelo. */
export type MovimentoPose = {
  grupo: GrupoPose;
  tipo: "rot" | "pos";
  eixo: "x" | "y" | "z";
  amplitude: number;
  frequencia: number;
  fase?: number;
};

export type RepousoAba = {
  /** Multiplica o ritmo da respiração base (RESPIRACAO). */
  ritmo: number;
  /** Multiplica a amplitude da respiração base. */
  intensidade: number;
  /** Movimentos próprios da aba (aceno, anotar...), somados à respiração. */
  extras?: MovimentoPose[];
};

export type PainelAba = {
  titulo: string;
  itens: { rotulo: string; valor: string }[];
  texto: string;
};

export type AbaInspect = {
  id: string;
  rotulo: string;
  pose: Pose;
  rosto: IdRosto;
  objeto: IdObjeto;
  camera: CameraAba;
  /** Cor do contraluz principal (hex). */
  contraluz: string;
  repouso: RepousoAba;
  painel: PainelAba;
};

/** Pose + rosto + objeto: o que o editor exporta, importa e aplica ao vivo. */
export type EstadoPose = Pick<AbaInspect, "pose" | "rosto" | "objeto">;

// ---------------------------------------------------------------------------
// MAPEAMENTO PARA O MODELO
// ---------------------------------------------------------------------------

export const GRUPO_ROSTO = "Visor";
export const GRUPO_OBJETOS = "Objetos";

/** Nós do modelo de cada grupo. `pivo` (espaço do pai) troca o ponto de giro;
 *  `espelha` aplica ao segundo nó a rotação espelhada (lado oposto). */
export const NOS_GRUPO: Record<GrupoPose, { nos: string[]; pivo?: Vec3; espelha?: boolean }> = {
  head: { nos: ["head"] },
  body: { nos: ["body"] },
  left_arm: { nos: ["left_arm"] },
  right_arm: { nos: ["right_arm"] },
  left_leg: { nos: ["left_leg"] },
  right_leg: { nos: ["right_leg"] },
  asas: { nos: ["Wings"] },
  // O pivô original da antena fica no pescoço; gira pela base, no topo da cabeça.
  antena: { nos: ["Antena"], pivo: [0, 0.49, -0.256] },
  xuxinhas: { nos: ["Xuxinha", "Xuxinha2"], espelha: true },
  // O Mic fica guardado dentro do braço esquerdo; para aparecer na mão ele
  // precisa ser girado/deslocado (gira em torno do próprio pivô, na mão).
  objeto: { nos: ["Mic"] },
};

/** Grupos cujos pés ficam presos ao chão (o modelo sobe se uma perna girar). */
export const GRUPOS_PES: GrupoPose[] = ["left_leg", "right_leg"];

/** Limites por grupo — rot em graus [x, y, z], pos em unidades do modelo
 *  (mesmo valor para os três eixos). Evitam que as peças atravessem o corpo. */
export const LIMITES: Record<GrupoPose, { rot: [Faixa, Faixa, Faixa]; pos: number }> = {
  head: { rot: [[-35, 25], [-55, 55], [-25, 25]], pos: 0.05 },
  body: { rot: [[-12, 12], [-30, 30], [-8, 8]], pos: 0.04 },
  left_arm: { rot: [[-50, 175], [-60, 60], [-170, 15]], pos: 0.06 },
  right_arm: { rot: [[-50, 175], [-60, 60], [-15, 170]], pos: 0.06 },
  left_leg: { rot: [[-35, 35], [-20, 20], [-25, 4]], pos: 0.03 },
  right_leg: { rot: [[-35, 35], [-20, 20], [-4, 25]], pos: 0.03 },
  asas: { rot: [[-35, 35], [-25, 25], [-15, 15]], pos: 0.04 },
  antena: { rot: [[-30, 30], [-30, 30], [-30, 30]], pos: 0.03 },
  xuxinhas: { rot: [[-40, 40], [-30, 30], [-40, 40]], pos: 0.03 },
  objeto: { rot: [[-180, 180], [-180, 180], [-180, 180]], pos: 0.2 },
};

/** Respiração base, igual em todas as abas (ritmo e intensidade vêm da aba). */
export const RESPIRACAO: MovimentoPose[] = [
  { grupo: "head", tipo: "pos", eixo: "y", amplitude: 0.007, frequencia: 0.24 },
  { grupo: "body", tipo: "pos", eixo: "y", amplitude: 0.004, frequencia: 0.24 },
  { grupo: "left_arm", tipo: "pos", eixo: "y", amplitude: 0.005, frequencia: 0.24, fase: 0.05 },
  { grupo: "right_arm", tipo: "pos", eixo: "y", amplitude: 0.005, frequencia: 0.24, fase: 0.05 },
  { grupo: "head", tipo: "rot", eixo: "z", amplitude: 2, frequencia: 0.11 },
  { grupo: "head", tipo: "rot", eixo: "x", amplitude: 1.1, frequencia: 0.17, fase: 0.3 },
  { grupo: "left_arm", tipo: "rot", eixo: "z", amplitude: -2, frequencia: 0.24, fase: 0.1 },
  { grupo: "right_arm", tipo: "rot", eixo: "z", amplitude: 2, frequencia: 0.24, fase: 0.1 },
  { grupo: "asas", tipo: "rot", eixo: "x", amplitude: 4, frequencia: 0.55 },
  { grupo: "xuxinhas", tipo: "rot", eixo: "z", amplitude: 3.4, frequencia: 0.2, fase: 0.2 },
];

// ---------------------------------------------------------------------------
// ABAS
// ---------------------------------------------------------------------------

const TEXTO_TESTE = "Texto de teste genérico para o painel lateral. Edite em src/inspect/poses.ts.";

export const ABAS: AbaInspect[] = [
  {
    id: "aba-1",
    rotulo: "PERFIL",
    pose: {
      head: { rot: [4, -10, -6] },
      right_arm: { rot: [0, 0, 150] },
      left_arm: { rot: [0, 0, -4] },
      antena: { rot: [0, 0, 6] },
    },
    rosto: "happy",
    objeto: "nenhum",
    camera: { alvoY: 0.52, distancia: 1, elevacao: -5, giro: -14, fov: 30 },
    contraluz: "#ffd23f",
    repouso: {
      ritmo: 1,
      intensidade: 1,
      extras: [{ grupo: "right_arm", tipo: "rot", eixo: "z", amplitude: 11, frequencia: 1.5 }],
    },
    painel: {
      titulo: "PERFIL // TESTE 01",
      itens: [
        { rotulo: "CAMPO A", valor: "VALOR DE TESTE" },
        { rotulo: "CAMPO B", valor: "000-000" },
        { rotulo: "CAMPO C", valor: "ATIVO" },
      ],
      texto: TEXTO_TESTE,
    },
  },
  {
    id: "aba-2",
    rotulo: "DIAGNÓSTICO",
    pose: {
      head: { rot: [-10, 8, 0] },
      right_arm: { rot: [40, 0, -28] },
      left_arm: { rot: [0, 0, -5] },
    },
    rosto: "wifi",
    objeto: "nenhum",
    camera: { alvoY: 0.64, distancia: 0.78, elevacao: 4, giro: -24, fov: 28 },
    contraluz: "#8fe3ff",
    repouso: { ritmo: 0.8, intensidade: 0.9 },
    painel: {
      titulo: "DIAGNÓSTICO // TESTE 02",
      itens: [
        { rotulo: "LEITURA 1", valor: "98%" },
        { rotulo: "LEITURA 2", valor: "ESTÁVEL" },
        { rotulo: "LEITURA 3", valor: "0,42" },
        { rotulo: "LEITURA 4", valor: "OK" },
      ],
      texto: TEXTO_TESTE,
    },
  },
  {
    id: "aba-3",
    rotulo: "MEMÓRIAS",
    pose: {
      head: { rot: [-24, 0, 4] },
      body: { rot: [-4, 0, 0] },
      left_arm: { rot: [6, 0, 3] },
      right_arm: { rot: [6, 0, -3] },
      asas: { rot: [14, 0, 0] },
      antena: { rot: [-18, 0, 0] },
      xuxinhas: { rot: [0, 0, -14] },
    },
    rosto: "triste",
    objeto: "nenhum",
    camera: { alvoY: 0.78, distancia: 0.58, elevacao: 12, giro: 10, fov: 26 },
    contraluz: "#9aa6ff",
    repouso: { ritmo: 0.6, intensidade: 1.3 },
    painel: {
      titulo: "MEMÓRIAS // TESTE 03",
      itens: [
        { rotulo: "ITEM 01", valor: "REGISTRO DE TESTE" },
        { rotulo: "ITEM 02", valor: "REGISTRO DE TESTE" },
        { rotulo: "ITEM 03", valor: "—" },
      ],
      texto: TEXTO_TESTE,
    },
  },
  {
    id: "aba-4",
    rotulo: "TAREFAS",
    pose: {
      head: { rot: [-14, 10, 0] },
      left_arm: { rot: [72, 0, 14] },
      right_arm: { rot: [42, 0, -10] },
      objeto: { rot: [90, 0, 0], pos: [0, 0, -0.12] },
    },
    rosto: "bored",
    objeto: "mic",
    camera: { alvoY: 0.6, distancia: 0.78, elevacao: 6, giro: 22, fov: 30 },
    contraluz: "#ffb000",
    repouso: {
      ritmo: 1.2,
      intensidade: 1,
      extras: [
        { grupo: "right_arm", tipo: "rot", eixo: "x", amplitude: 4, frequencia: 2.2 },
        { grupo: "head", tipo: "rot", eixo: "y", amplitude: 3, frequencia: 0.3 },
      ],
    },
    painel: {
      titulo: "TAREFAS // TESTE 04",
      itens: [
        { rotulo: "TAREFA 1", valor: "PENDENTE" },
        { rotulo: "TAREFA 2", valor: "EM ANDAMENTO" },
        { rotulo: "TAREFA 3", valor: "CONCLUÍDA" },
      ],
      texto: TEXTO_TESTE,
    },
  },
];

// ---------------------------------------------------------------------------
// AUXILIARES
// ---------------------------------------------------------------------------

const limita = (v: number, [min, max]: Faixa) => Math.min(max, Math.max(min, v));

/** Prende a pose aos LIMITES (rotações e deslocamentos). */
export function limitaPose(pose: Pose): Pose {
  const saida: Pose = {};
  for (const grupo of GRUPOS_POSE) {
    const p = pose[grupo];
    if (!p) continue;
    const lim = LIMITES[grupo];
    saida[grupo] = {
      ...(p.rot && { rot: p.rot.map((v, i) => limita(v, lim.rot[i])) as Vec3 }),
      ...(p.pos && { pos: p.pos.map((v) => limita(v, [-lim.pos, lim.pos])) as Vec3 }),
    };
  }
  return saida;
}

const ehVec3 = (v: unknown): v is Vec3 =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n));

/** Valida um JSON colado no editor. Devolve o estado ou uma mensagem de erro. */
export function validaEstadoPose(dado: unknown): EstadoPose | string {
  if (!dado || typeof dado !== "object") return "o JSON precisa ser um objeto";
  const d = dado as Record<string, unknown>;
  const fonte = (d.pose ?? d) as Record<string, unknown>;
  const pose: Pose = {};
  for (const [chave, valor] of Object.entries(fonte)) {
    if (chave === "rosto" || chave === "objeto") continue;
    if (!(GRUPOS_POSE as readonly string[]).includes(chave)) return `grupo desconhecido: ${chave}`;
    const g = valor as PoseGrupo;
    if (g.rot !== undefined && !ehVec3(g.rot)) return `${chave}.rot precisa ser [x, y, z]`;
    if (g.pos !== undefined && !ehVec3(g.pos)) return `${chave}.pos precisa ser [x, y, z]`;
    pose[chave as GrupoPose] = { ...(g.rot && { rot: g.rot }), ...(g.pos && { pos: g.pos }) };
  }
  const rosto = (d.rosto ?? "padrao") as string;
  const objeto = (d.objeto ?? "nenhum") as string;
  if (!(rosto in ROSTOS)) return `rosto desconhecido: ${rosto}`;
  if (!(objeto in OBJETOS)) return `objeto desconhecido: ${objeto}`;
  return { pose: limitaPose(pose), rosto: rosto as IdRosto, objeto: objeto as IdObjeto };
}
