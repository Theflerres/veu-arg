// ============================================================================
// GRUPOS — fase atual do site
// ============================================================================
// Os arquivos das Fagulhas continuam em `fagulhas-data.ts`, apenas fora de
// exibição. Esta é a lista que a tela de arquivos mostra agora.
//
// Cada grupo tem um campo de senha próprio, mas nenhuma senha é válida por
// enquanto: o input é apenas decorativo (desabilitado, com cadeado).
//
// Para preencher as frases pendentes, edite `phrase` abaixo.

export interface GrupoData {
  id: number;
  label: string;
  codename: string;
  level: string;
  size: string;
  /** Frase em vermelho exibida sob o campo de senha bloqueado. */
  phrase: string;
}

export const GRUPOS: GrupoData[] = [
  {
    id: 0,
    label: "Grupo - Alpha",
    codename: "Alpha",
    level: "ALPHA",
    size: "-- MB",
    phrase: "Espero que tenha pessoas boas no meu grupo, não quero que seja um grupo ruim...",
  },
  {
    id: 1,
    label: "Grupo - Beta",
    codename: "Beta",
    level: "BETA",
    size: "-- MB",
    phrase:
      "Dizem que tudo depende de quem cai com você... será que vou ter sorte ou vou acabar com pessoas difíceis de lidar?",
  },
  {
    id: 2,
    label: "Grupo - Gamma",
    codename: "Gamma",
    level: "GAMMA",
    size: "-- MB",
    phrase:
      "Ainda não faço ideia de quem serão meus colegas. O jeito é aguardar a distribuição final e torcer pelo melhor...",
  },
  {
    id: 3,
    label: "Grupo - Delta",
    codename: "Delta",
    level: "DELTA",
    size: "-- MB",
    phrase:
      "Eu tenho que esperar que os grupos sejam escolhidos, não tem nada ainda aqui...",
  },
  {
    id: 4,
    label: "Grupo - Epsilon",
    codename: "Epsilon",
    level: "EPSILON",
    size: "-- MB",
    phrase:
      "Seja lá quem for sorteado para ficar comigo, espero que a gente consiga pelo menos se entender.",
  },
  {
    id: 5,
    label: "Grupo - Omega",
    codename: "Omega",
    level: "OMEGA",
    size: "-- MB",
    phrase: "Sera que o ███████ vai interferir no meu grupo? Espero que não. . .",
  },
];
