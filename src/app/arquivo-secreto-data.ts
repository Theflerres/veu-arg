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
    // TODO: colar aqui os textos de Bio, Notas e Registros do Hunter West.
    // Em Registros, a menção ao Austin deve ficar censurada (ex.: "████████").
    bio: `[BIO DO HUNTER WEST]`,
    notas: `[NOTAS DO HUNTER WEST]`,
    registros: `[REGISTROS DO HUNTER WEST]`,
    foto: HUNTER_WEST_PHOTO,
  },
  {
    id: "austin",
    nome: "████████████████",
    idade: "██ ████",
    dimensao: "██████████ ███",
    bio: `████████████ ██████████████████████████ ████████ ██████████████████.\n\n██████████████████████████████████ ████████████████████████.`,
    notas: `████████████████████ ████████████████████████████████████████.\n████████████████████████ ██████████████████████████ █████████████████.`,
    registros: `████████████████████████████ ██████████████████████████████████████.\n██████████████ ████████████████████████████████████ ██████████████████.`,
    foto: null,
  },
];
