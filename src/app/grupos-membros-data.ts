// ============================================================================
// GRUPOS — MEMBROS (conteúdo dos arquivos liberados)
// ============================================================================
// Lista de quem está em cada grupo. A chave é o `codename` do grupo em
// `grupos-data.ts` (Alpha, Beta, ...). Editar nomes, trocar gente de grupo ou
// adicionar/remover membros aqui é seguro: a tela do arquivo se monta sozinha.
//
// ── FOTOS ───────────────────────────────────────────────────────────────────
// As fotos vêm de `photos/players/` (a mesma pasta do Scanner). Cada membro é
// casado com o arquivo pelo "slug" do nome: minúsculo, sem acento, sem espaço
// nem pontuação. Ex.: "Éter" → `eter` casa com `Éter.png`; "Lillie" casa com
// `Lil_lie.png`; "Herom HQD" casa com `Heromhqd.png`.
//
// Quando o nome do arquivo NÃO bate com o apelido (ex.: "Sharks" ↔
// `Sharks T.png`), use a forma `{ nome, foto }`, onde `foto` é o nome do
// arquivo sem extensão (também comparado por slug, então maiúsculas, espaços
// e pontos não importam).
//
// Sem foto encontrada → o card mostra uma silhueta genérica.

export type MembroEntrada = string | { nome: string; foto: string };

export const MEMBROS_POR_GRUPO: Record<string, MembroEntrada[]> = {
  Alpha: [
    { nome: "??", foto: "Mesquits" },
    { nome: "Sharks", foto: "Sharks T" },
    { nome: "Mae", foto: "Mae Y." },
    "Solis",
    "Ohaikou",
    "Trux",
    { nome: "Mori", foto: "Mori Yuki" },
    { nome: "Nina U.", foto: "Nina Untergang" },
    "Asriel",
    "Taro",
    { nome: "Morgana E.", foto: "Morgana Eigengrau" },
  ],
  Beta: [
    { nome: "Lia R.", foto: "Lia Rosewood" },
    { nome: "Dimitri K.", foto: "Dimitri Karpov" },
    "Kyo",
    { nome: "Levi K.", foto: "Levi Karpov" },
    "Eira",
    { nome: "Tide", foto: "T1de" },
    "Yako",
    "Asurada",
    "Solidaster",
    { nome: "Belchior", foto: "Belchior Orphelios" },
    "Kagami",
  ],
  Gamma: [
    "Hugo",
    { nome: "??", foto: "Cyphiro" },
    // Duas pessoas diferentes chamadas "Lilith T." — não é duplicata.
    { nome: "Lilith T. I", foto: "Lilith I" },
    { nome: "Lilith T. II", foto: "Lilith II" },
    "Herom HQD",
    "Kaile",
    { nome: "Apollo", foto: "Appolo" },
    "Airis",
    "Roku",
    "Bastian",
    { nome: "Lucille", foto: "Lucille Finch" },
  ],
  Delta: [
    "Nephe Mori",
    "Naya Solace",
    { nome: "Raviel A.", foto: "Raviel Ankhra" },
    "Luke",
    "Nerith",
    "Spectrum",
    "Lance",
    { nome: "Keke A.", foto: "keke aqua" },
    { nome: "Herald", foto: "Herald Fairfax" },
    "Berus",
    "Dan",
  ],
  Epsilon: [
    { nome: "Phoros D.", foto: "Phoros Droplaug" },
    { nome: "Marcos P.", foto: "Marcos Pepo" },
    { nome: "Lester N.", foto: "Lester Nerrie" },
    { nome: "Lyra G.", foto: "Lyra" },
    "Sophia D.",
    "Shiro",
    { nome: "Keruu M.", foto: "Keruv Morrow" },
    { nome: "Lorelyn A. Winter", foto: "LoreWinterr" },
    { nome: "Aspen", foto: "Aspen Yurkov Mori" },
    "Beto",
    "Nakime",
  ],
  Omega: [
    "Kaluster",
    "Lillie",
    { nome: "Fenrir", foto: "Fenrir Almeida" },
    "Kaim",
    "Hai",
    "Lirio",
    "Éter",
    { nome: "Nihil", foto: "Nihil Aurel" },
    { nome: "Misuri K.", foto: "Misuri" },
    { nome: "Dom. Mochi", foto: "Dominique Mochi" },
    "Abyss",
  ],
};

// ── RESOLUÇÃO (não precisa editar daqui pra baixo) ──────────────────────────

const PLAYER_MODULES = import.meta.glob(
  "../../photos/players/*.{png,jpg,jpeg,webp,gif,avif}",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

/** "Lilith T. II" → "lilith-t-ii"; "Éter" → "eter"; "??" → "". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug sem hífens: usado só para casar nome ↔ arquivo de foto. */
function photoKey(text: string): string {
  return slugify(text).replace(/-/g, "");
}

const PHOTOS_BY_KEY: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const path of Object.keys(PLAYER_MODULES).sort()) {
    const base = path.split("/").pop()!.replace(/\.[^.]+$/, "");
    const key = photoKey(base);
    if (key && !map.has(key)) map.set(key, PLAYER_MODULES[path]);
  }
  return map;
})();

/** Silhueta genérica para quem não tem foto na pasta. */
export const MEMBRO_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300">` +
      `<rect width="240" height="300" fill="#0a160f"/>` +
      `<circle cx="120" cy="112" r="50" fill="#123a24"/>` +
      `<ellipse cx="120" cy="300" rx="96" ry="118" fill="#123a24"/>` +
      `<text x="120" y="288" font-family="monospace" font-size="14" fill="#1c5c38" text-anchor="middle">SEM REGISTRO</text>` +
      `</svg>`
  );

export interface Membro {
  /** Único em todo o site: `<grupo>--<slug do nome completo>`. */
  id: string;
  nome: string;
  /** URL da foto, ou `null` se nenhum arquivo casou. */
  foto: string | null;
}

/** Membros resolvidos (id + foto) do grupo com esse `codename`. */
export function getMembrosDoGrupo(codename: string): Membro[] {
  const entradas = MEMBROS_POR_GRUPO[codename] ?? [];
  const usados = new Set<string>();

  return entradas.map((entrada) => {
    const nome = typeof entrada === "string" ? entrada : entrada.nome;
    const fotoRef = typeof entrada === "string" ? entrada : entrada.foto;

    // "??" não gera slug; ainda assim precisa de um id estável e único.
    const base = `${slugify(codename)}--${slugify(nome) || "anonimo"}`;
    let id = base;
    for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
    if (import.meta.env.DEV && id !== base) {
      console.warn(`[grupos] nome repetido em ${codename}: "${nome}" (id → ${id})`);
    }
    usados.add(id);

    return { id, nome, foto: PHOTOS_BY_KEY.get(photoKey(fotoRef)) ?? null };
  });
}
