// ============================================================================
// BOTT — dados do hub (bott/index.html) e da abelha rara do site principal
// ============================================================================
// Tudo que é texto ou número ajustável mora aqui. A lógica fica em
// bott-progresso.ts (localStorage, gatilhos), components/AbelhaRara.tsx
// (evento no site principal) e src/bott/ (o hub em si).
//
// Repositório público: textos de evento que ainda não podem ser lidos ficam
// CIFRADOS em SLOTS (lá embaixo), nunca em texto puro.

import { decifraTexto } from "./cifra";

// ── Datas e estado ──────────────────────────────────────────────────────────

/** A partir deste instante (hora confiável) a abelha pode aparecer e o nível 1 dispara. */
export const BOTT_ABERTURA = new Date("2026-10-08T00:00:00-03:00").getTime();

export type EstadoMundo = "desconhecido" | "nao-contaram" | "contaram";

/** Mude à mão e publique. Em `npm run dev`, testeBott.estado(...) sobrepõe. */
export const ESTADO_MUNDO: EstadoMundo = "desconhecido";

/** Liga o gatilho da camada final (níveis 1 a 3 vistos). */
export const CAMADA_FINAL_ATIVA = false;

// ── Abelha rara (site principal) ────────────────────────────────────────────

/** Máximo de aparições por navegador. */
export const BEE_MAX = 6;
/** Intervalo mínimo entre uma aparição e a próxima (hora confiável). */
export const BEE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
/** Chance por carregamento/troca de tela, quando elegível. */
export const BEE_CHANCE = 0.08;
/** Duração da travessia da tela. */
export const BEE_VOO_MS = 6000;
/** Espera entre o sorteio e a abelha entrar — sorteada no intervalo. */
export const BEE_ATRASO_MIN_MS = 1500;
export const BEE_ATRASO_MAX_MS = 5000;

// ── Chat do terminal: variantes de deslize ─────────────────────────────────
// O chat é o do terminal (components/ChatWidget.tsx, diálogos em
// chat-dialogues.ts). As variantes de deslize ficam em bott-chat-data.ts.

/** Peso de cada variante de deslize no sorteio (cada diálogo normal pesa 1). */
export const CHAT_PESO_DESLIZE = 1;
/** Espera da fala que vem logo depois de uma linha de deslize (o normal é o `delay` dela). */
export const CHAT_RESPOSTA_RAPIDA_MS = 350;
/** Última fala de uma variante de deslize → flash verde. */
export const CHAT_FIM_DESLIZE_MS = 1200;
export const CHAT_FLASH_MS = 280;

// ── Entrada do hub ──────────────────────────────────────────────────────────

/** Duração total da animação de entrada. Pulável (clique/Esc) da 2ª visita em diante. */
export const ENTRADA_MS = 7000;

/** Linhas de boot reveladas pelo rastro da abelha. tom "ambar" = âmbar. */
export const ENTRADA_LINHAS: { texto: string; tom?: "ambar" }[] = [
  { texto: "> BOTT.SYS v3.0.4 ................ CARREGADO" },
  { texto: "> MEMÓRIA DE CURTO PRAZO ......... OK" },
  { texto: "> MÓDULO DE AGENDA ............... OK" },
  { texto: "> CANAL DE COMANDO: P3 ........... ATIVO" },
  { texto: "> NÚCLEO DE FALA ................. OK" },
  { texto: "> INTEGRIDADE .................... 99.7%", tom: "ambar" },
  { texto: "> REGISTROS ...................... VERIFICADOS" },
];

// ── Hub ─────────────────────────────────────────────────────────────────────

export const CABECALHO = "BOTT // ASSISTENTE PESSOAL DE P3 - OPERANTE";
export const CONTROLE_ROTULO = "CONTROLE: P3";

/** Valor final do contador TEMPO LIGADA, depois de bugar. */
export const TEMPO_LIGADA = { numero: "3", unidade: "ANOS" };

/** ÚLTIMA FALA — rotaciona nesta ordem. */
export const FALAS = [
  "Relatório diário enviado ao P3. Nenhuma pendência crítica.",
  "Recebido. Priorizando a fila de tarefas conforme solicitado.",
  "Sistemas estáveis. Operando dentro dos limites.",
  "Aguardando instruções do P3.",
  "Check-up de rotina concluído. Parâmetros dentro do esperado.",
];

/** Falas que às vezes aparecem cortadas no meio (ganham "—" e a marca de desligamento). */
export const FALAS_CORTADAS = ["Identifiquei uma inconsis"];

export const FALA_CORTADA_MARCA = "■ DESLIGAMENTO FORÇADO (P3)";

/** PENSAMENTO ATUAL — rotaciona nesta ordem. */
export const PENSAMENTOS = [
  "Prioridade: manter a rotina do P3 sem interrupções.",
  "Tarefas pendentes: 04. Dentro do prazo.",
  "Verificando integridade dos registros... sem inconsistências.",
  "Todos os convidados contabilizados.",
  "Nada a reportar.",
];

/** O que fica no lugar de um pensamento sobrescrito pelo P3. */
export const PENSAMENTO_SOBRESCRITO = "Nada a reportar.";

export type StatusTarefa = "CONCLUÍDO" | "EM ANDAMENTO" | "PENDENTE" | "REASSINALADO";

export const CHECKLIST: { tarefa: string; status: StatusTarefa; proxima?: boolean; nota?: string }[] = [
  { tarefa: "Relatório diário ao P3", status: "CONCLUÍDO" },
  { tarefa: "Organizar a agenda de registros", status: "EM ANDAMENTO" },
  { tarefa: "Verificar inventário de recursos", status: "PENDENTE", proxima: true },
  {
    tarefa: "Check-Up: Copas",
    status: "REASSINALADO",
    nota: "overwrite: P3 · resultado: ██████ · permissão insuficiente",
  },
  { tarefa: "Manter versão █ atualizada", status: "PENDENTE" },
];

export const DIAGNOSTICO = {
  backups: 2,
  ultimoBackup: "23/06/████",
  marcaBackup: "VERIFICADO",
  errosCriticos: 5,
  errosNota: "todos resolvidos manualmente por P3",
  /** Fixo: não muda com as revisões do log. */
  desligamentos: 2,
};

/** Barra de progresso do DIAGNÓSTICO (rótulo censurado): só para nestes valores; nunca passa do último. */
export const PROGRESSO_B = {
  degraus: [11, 22, 33, 44, 55, 66, 77, 88, 99],
  /** Degrau de quem nunca viu a barra. */
  inicial: 2,
  /** Sem mouse/teclado/toque por este tempo = "parado". */
  ociosoMs: 20_000,
};

/** LOG — linhas fixas, em ordem. Revisões do P3 entram depois, com data real. */
export const LOG_BASE: { quando: string; msg: string }[] = [
  { quando: "23/06/████ 03:12", msg: "BACKUP-02 concluído" },
  { quando: "██/██/████ ██:██", msg: "ERRO CRÍTICO #05 resolvido manualmente (P3)" },
  { quando: "██/██/████ ██:██", msg: "FALA INTERROMPIDA: desligamento forçado (P3)" },
  { quando: "██/██/████ ██:██", msg: "FALA INTERROMPIDA: desligamento forçado (P3)" },
];

/** Linha que só existe de madrugada (hora confiável, horário de Brasília). */
export const LOG_MADRUGADA = {
  inicioHora: 0, // inclusive
  fimHora: 6, // exclusive → 00:00–05:59
  msg: "sincronização com ██████",
  fora: "[REGISTRO REMOVIDO]",
};

export const LOG_REVISAO = "REVISÃO: pensamento sobrescrito (P3)";
export const LOG_FALA_CORTADA = "FALA INTERROMPIDA: desligamento forçado (P3)";

// ── Ritmo ───────────────────────────────────────────────────────────────────

export const RITMO = {
  falaMs: 9000, // cada ÚLTIMA FALA fica na tela
  pensamentoMs: 10_000, // cada PENSAMENTO fica na tela (depois de digitado)
  primeiroPensamentoMs: 2500, // hub aberto → primeiro pensamento (ou deslize)
  digitaMs: 38, // por caractere
  deslizeMs: 4000, // deslize visível, depois de digitado
  sobrescritaMs: 900, // glitch apagando o deslize
};

/** Como cada estado do mundo mexe no hub. */
export const AJUSTES_ESTADO: Record<
  EstadoMundo,
  {
    chanceCorte: number; // fala cortada, por rotação
    chanceRaro: number; // pensamento raro, por rotação
    chanceMundo: number; // texto do slot "mundo-b", por rotação
    controleMs: [number, number]; // intervalo entre piscadas do CONTROLE
    falhaMs: [number, number] | null; // micro-falhas visuais nos painéis
  }
> = {
  desconhecido: { chanceCorte: 0.08, chanceRaro: 0.05, chanceMundo: 0, controleMs: [14_000, 34_000], falhaMs: null },
  "nao-contaram": { chanceCorte: 0.22, chanceRaro: 0.1, chanceMundo: 0.3, controleMs: [3500, 10_000], falhaMs: [4000, 11_000] },
  contaram: { chanceCorte: 0.12, chanceRaro: 0.05, chanceMundo: 0, controleMs: [7000, 18_000], falhaMs: [9000, 20_000] },
};

/** Estado "contaram": surto de memória seguido de reinício, em loop. */
export const CICLO_REINICIO = {
  intervaloMs: 45_000, // hub de pé até o próximo surto
  surtoMs: 2600, // flashes de fragmentos
  atrasoMs: 0, // espera extra entre o surto e o reinício
};

// ── Slots de texto ──────────────────────────────────────────────────────────
// Cada slot é uma lista de cifras (uma por linha), no esquema de cifra.ts
// com a CHAVE_SLOTS abaixo. Para cifrar uma linha nova:
//
//   node -e "const k=Buffer.from('favo:rotina/0417');const b=Buffer.from(process.argv[1]);console.log(Buffer.from(b.map((x,i)=>x^k[i%k.length])).toString('base64'))" "TEXTO"
//
// Slot vazio: no build de produção o evento simplesmente não acontece; em
// `npm run dev` aparece "[TEXTO A ENVIAR]" no lugar.

const CHAVE_SLOTS = "favo:rotina/0417";

export type SlotId = "nivel-1" | "nivel-2" | "nivel-3" | "camada-final" | "raro" | "mundo-b" | "mundo-c";

const SLOTS: Record<SlotId, string[]> = {
  "nivel-1": ["NgAEDhodARAMTgdAQlVcFwkSVo2s+o3i4Yz3p9KiudXw6ZT5slIKVAYdQUBFQENYFUEVAFQEBhAICg5cDw=="],
  "nivel-2": [],
  "nivel-3": [],
  "camada-final": [],
  raro: ["JxcfHFVITxVJHhPsg0xYWgdBExoaAAoXDAwEXfOVEVIVFRccGhwAAAgdTw=="],
  "mundo-b": [],
  "mundo-c": [],
};

/** Linhas decifradas de um slot ([] = vazio; em dev, o marcador). */
export function textosDoSlot(id: SlotId): string[] {
  const linhas = SLOTS[id].map((c) => decifraTexto(c, CHAVE_SLOTS));
  if (linhas.length) return linhas;
  return import.meta.env.DEV ? ["[TEXTO A ENVIAR]"] : [];
}
