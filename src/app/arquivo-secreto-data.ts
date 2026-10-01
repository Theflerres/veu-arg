// ============================================================================
// ARQUIVO SECRETO — Hunter West + Austin
// ============================================================================
// Ficha escondida: não aparece entre as Fagulhas nem entre os Grupos. Só abre
// pelo ícone quase invisível no canto superior esquerdo do terminal
// (`components/ArquivoSecreto.tsx`). Editar os textos aqui é seguro: a tela se
// monta sozinha a partir desta lista.
//
// ── CENSURA ─────────────────────────────────────────────────────────────────
// Não existe flag de "censurado": o que for bloco █ aparece como bloco █, no
// mesmo padrão das Fagulhas sem conteúdo definido. Para liberar um trecho
// (ex.: quando a história do Austin for decidida) basta trocar os █ pelo texto.
//
// ── FOTOS ───────────────────────────────────────────────────────────────────
// `foto: null` → o card mostra uma silhueta censurada. O Hunter West reaproveita
// `photos/players/hunter-west.png` (a mesma foto que o Scanner usava).

import { HUNTER_WEST_PHOTO } from "./scanner-data";

export interface PerfilSecreto {
  /** Chave estável (React key). */
  id: string;
  nome: string;
  idade: string;
  dimensao: string;
  bio: string;
  notas: string;
  registros: string;
  foto: string | null;
}

export const PERFIS_SECRETOS: PerfilSecreto[] = [
  {
    id: "hunter-west",
    nome: "Hunter West",
    idade: "30 anos",
    dimensao: 'Espiralium "1"',
    // Em Registros, a menção ao Austin fica censurada (████).
    bio: `Hunter West chegou ao Véu com a primeira leva de convidados, inicialmente como professor de música. Já parecia ter proximidade com algumas pessoas que vieram junto — Fortunity era uma delas. Adaptou-se bem à dimensão e fez amizades ao longo de sua estadia.`,
    notas: `Parecia sofrer de uma "doença" que funcionava quase como uma segunda personalidade dentro dele mesmo, autossabotando o indivíduo — nunca foi identificada, e por isso passou a ser chamada apenas de "Hunter 2". Ao longo do tempo, Hunter foi ficando conhecido entre os convidados, mas sua "doença" também avançou, até chegar a um estágio em que ele ficou cego. Graças à sua vivência numa dimensão onde a magia já existia, conseguiu contornar isso sem grandes problemas. Teve poucas interações diretas com Peluche; a presença de P3 no Véu, nessa época, ainda era limitada — nenhuma interação chegou a acontecer entre os dois. Hunter "morreu" pacificamente, longe de seus amigos — algo que lembra como gatos se afastam dos donos antes de morrer, para poupá-los da tristeza de ver a partida. Seu último contato foi com Fortunity, através da ligação interna que os unia: nenhuma palavra, apenas um aviso de que seu tempo havia chegado ao fim.`,
    registros: `[REGISTRO PESSOAL — P3]

Encontrei Hunter alguns minutos depois de sua "morte". Não cheguei antes porque Peluche ainda não tinha terminado meu contrato — mas isso não vem ao caso agora. Levei-o para a Torre de Memórias e o tratei. A "doença" dele, depois da morte, fez algo que ainda não sei explicar direito: foi como se ela simplesmente deixasse de existir — como se só tivesse matado o corpo para depois abandoná-lo. Depois do tratamento, ajustei as memórias dele. Ao "apagar" e "morrer", acordou de novo no teatro — agora reformado —, com a única explicação de que "o momento dele ainda não tinha chegado" e que ele ainda tinha uma história pra contar. Pra não deixá-lo completamente sozinho depois que todos os antigos convidados partiram, trouxe ████████████████. Hunter explicou a situação: onde estava, quem era. Hoje os dois trabalham juntos, numa área isolada do Véu, longe de qualquer tipo de distração.`,
    foto: HUNTER_WEST_PHOTO,
  },
  {
    id: "registro-02",
    nome: "████████████████",
    idade: "██ ████",
    dimensao: "██████████ ███",
    bio: `████████████ ██████████████████████████ ████████ ██████████████████.\n\n██████████████████████████████████ ████████████████████████.`,
    notas: `████████████████████ ████████████████████████████████████████.\n████████████████████████ ██████████████████████████ █████████████████.`,
    registros: `████████████████████████████ ██████████████████████████████████████.\n██████████████ ████████████████████████████████████ ██████████████████.`,
    foto: null,
  },
];
