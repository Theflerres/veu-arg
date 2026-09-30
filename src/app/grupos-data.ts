// ============================================================================
// GRUPOS — fase atual do site
// ============================================================================
// Os arquivos das Fagulhas continuam em `fagulhas-data.ts`, apenas fora de
// exibição. Esta é a lista que a tela de arquivos mostra agora.
//
// Os arquivos estão liberados: ao abrir um grupo, o campo de senha digita
// `senha` sozinho (o sistema "se destranca") e então mostra os membros,
// definidos em `grupos-membros-data.ts`.
//
// `phrase` é a frase antiga da fase bloqueada — hoje não é exibida.

export interface GrupoData {
  id: number;
  label: string;
  codename: string;
  level: string;
  size: string;
  /** Frase da fase bloqueada (não exibida no momento). */
  phrase: string;
  /** Senha auto-digitada ao abrir o arquivo. */
  senha: string;
}

export const GRUPOS: GrupoData[] = [
  {
    id: 0,
    label: "Grupo - Alpha",
    codename: "Alpha",
    level: "ALPHA",
    senha: "ALPHA-7F3K-01",
    size: "-- MB",
    phrase: "Espero que tenha pessoas boas no meu grupo, não quero que seja um grupo ruim...",
  },
  {
    id: 1,
    label: "Grupo - Beta",
    codename: "Beta",
    level: "BETA",
    senha: "BETA-Q9X2-02",
    size: "-- MB",
    phrase:
      "Dizem que tudo depende de quem cai com você... será que vou ter sorte ou vou acabar com pessoas difíceis de lidar?",
  },
  {
    id: 2,
    label: "Grupo - Gamma",
    codename: "Gamma",
    level: "GAMMA",
    senha: "GAMMA-4TR8-03",
    size: "-- MB",
    phrase:
      "Ainda não faço ideia de quem serão meus colegas. O jeito é aguardar a distribuição final e torcer pelo melhor...",
  },
  {
    id: 3,
    label: "Grupo - Delta",
    codename: "Delta",
    level: "DELTA",
    senha: "DELTA-M1Z6-04",
    size: "-- MB",
    phrase:
      "Eu tenho que esperar que os grupos sejam escolhidos, não tem nada ainda aqui...",
  },
  {
    id: 4,
    label: "Grupo - Epsilon",
    codename: "Epsilon",
    level: "EPSILON",
    senha: "EPSILON-8WV5-05",
    size: "-- MB",
    phrase:
      "Seja lá quem for sorteado para ficar comigo, espero que a gente consiga pelo menos se entender.",
  },
  {
    id: 5,
    label: "Grupo - Omega",
    codename: "Omega",
    level: "OMEGA",
    senha: "OMEGA-X0N9-06",
    size: "-- MB",
    phrase: "Sera que o ███████ vai interferir no meu grupo? Espero que não. . .",
  },
];
