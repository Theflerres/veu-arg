// ============================================================================
// SCANNER DE PLAYERS — fotos e pools de valores falsos
// ============================================================================
// Este arquivo é a parte "configurável" do Scanner. O componente
// (`components/PlayerScanner.tsx`) não precisa ser tocado para trocar fotos
// ou mexer nos valores exibidos.
//
// ── FOTOS ───────────────────────────────────────────────────────────────────
// Basta largar as imagens em `photos/players/`. O Vite resolve a pasta em
// tempo de build (import.meta.glob), então qualquer arquivo novo entra no
// loop sozinho, na ordem alfabética do nome do arquivo.

const PLAYER_MODULES = import.meta.glob(
  "../../photos/players/*.{png,jpg,jpeg,webp,gif,avif}",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

/**
 * Silhuetas usadas só enquanto `photos/players/` estiver vazia, para o painel
 * já rodar o efeito completo. Assim que existir uma foto real na pasta, estas
 * saem de cena automaticamente.
 */
const PLACEHOLDERS: string[] = [0, 1, 2].map((i) => {
  const head = [68, 60, 74][i];
  const shoulder = [128, 116, 140][i];
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="420">` +
        `<rect width="340" height="420" fill="#0a160f"/>` +
        `<circle cx="170" cy="150" r="${head}" fill="#123a24"/>` +
        `<ellipse cx="170" cy="420" rx="${shoulder}" ry="160" fill="#123a24"/>` +
        `<text x="170" y="404" font-family="monospace" font-size="18" fill="#1c5c38" text-anchor="middle">SEM REGISTRO</text>` +
        `</svg>`
    )
  );
});

/** Fotos que o Scanner percorre em loop, na ordem. */
export const PLAYER_PHOTOS: string[] = (() => {
  const found = Object.keys(PLAYER_MODULES)
    .sort()
    .map((path) => PLAYER_MODULES[path]);
  return found.length > 0 ? found : PLACEHOLDERS;
})();

// ── VALORES FALSOS ──────────────────────────────────────────────────────────
// Nada aqui é dado real de ninguém. O valor sorteado serve apenas de "molde":
// define o comprimento e onde ficam os espaços. Os caracteres em si são
// sorteados de novo a cada tick enquanto a foto estiver na tela — ou seja, o
// texto nunca se resolve. Editar/adicionar entradas nestas listas é seguro.

export const NOMES_FAKE: string[] = [
  "████ ███████",
  "SUJEITO ███-04",
  "ANON ████████",
  "REG ██ ██████",
  "███████ ████",
  "ALVO ████-77",
];

export const IDADES_FAKE: string[] = [
  "██ ANOS",
  "?? ANOS",
  "███ CICLOS",
  "██-██ ANOS",
  "INDETERMINADA",
];

export const DIMENSOES_FAKE: string[] = [
  "SETOR ██-███",
  "DIM ████/██",
  "CAMADA ███",
  "██████ PROFUNDO",
  "FORA DO VÉU",
  "VETOR ██-██-██",
];

/** Conjunto de caracteres que cada campo sorteia durante o embaralhamento. */
export const CHARSETS = {
  nome: "ABCDEFGHIJKLMNOPQRSTUVWXYZ▓▒░#@$%&*█¥Ø§",
  idade: "0123456789?#%█▓▒/\\",
  dimensao: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789▓▒░/\|<>█§Ø",
} as const;

export interface ScannerField {
  label: string;
  /** Molde: só o comprimento e a posição dos espaços são usados. */
  template: string;
  charset: string;
}

function pick(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

/** Sorteia os três campos exibidos para a foto atual. */
export function buildScannerFields(): ScannerField[] {
  return [
    { label: "NOME", template: pick(NOMES_FAKE), charset: CHARSETS.nome },
    { label: "IDADE", template: pick(IDADES_FAKE), charset: CHARSETS.idade },
    {
      label: "DIMENSÃO DE ORIGEM",
      template: pick(DIMENSOES_FAKE),
      charset: CHARSETS.dimensao,
    },
  ];
}
