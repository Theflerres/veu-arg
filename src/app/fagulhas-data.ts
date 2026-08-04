import artwork1 from "../../photos/Artwork-1.png";
import artwork2 from "../../photos/Artwork-2.png";
import artwork3 from "../../photos/Artwork-3.png";
import artwork4 from "../../photos/Artwork-4.png";
import artwork5 from "../../photos/Artwork-5.png";
import artwork6 from "../../photos/Artwork-6.png";
import lampada1 from "../../photos/lampada 1.png";
import lampada2 from "../../photos/lampada 2.png";
import lampada3 from "../../photos/lampada 3.png";
import lampada4 from "../../photos/lampada 4.png";
import lampada5 from "../../photos/lampada 5.png";
import lampada6 from "../../photos/lampada 6.png";
 
export interface FagulhaData {
  id: number;
  label: string;
  codename: string;
  level: string;
  size: string;
  artwork: string;
  lampada: string;
  idCode: string;
  nome: string;
  status: string;
  classificacao: string;
  bio: string;
  notas: string;
  registros: string;
}

const CENSURADO_1 = {
  codename: "██████",
  nome: "████████",
  status: "██ ██ ██ ██",
  classificacao: "██ ██ ██ ██ ██",
  bio: `> IDADE: ████████ | ALTURA: ████████\n\n███████████ ████████████████ ████████ ██████████████████████████.\n\n████████████████████████████████████████████████ ██████████████.\n████████████ ██████████████████████████████████████████████████████████.`,
  notas: `████████████████████ ████████████████████████████████████████.\n████████████████████████ ██████████████████████████ █████████████████████████████████████████.\n██████████████████████ ████████████.`,
  registros: `████████████████████████████ ██████████████████████████████████████.\n██████████████ ████████████████████████████████████ ██████████████████.`,
};
 
const CENSURADO_2 = {
  codename: "████",
  nome: "██████████",
  status: "██ ██ ██ ██ ██",
  classificacao: "██ ██ ██ ██",
  bio: `> IDADE: ██████ | ALTURA: ██████████\n\n██████████████████████████████████████ ██████████ ██████████████████████████████████.\n████████████████████.\n\n██████████████████████████████████████████████████████ ████████████████████████████████.`,
  notas: `████████████████████████████████████████████.\n████████ █████████████████████ ███████████████████████████ ██████████████████████████████████████████████████████.\n██████████████████████████████████████ ██████████████████████████.`,
  registros: `████████████████████ ██████████████████████████████████████████████████████████████████████.\n███████████████████████████ ██████████████.`,
};

export const FAGULHAS: FagulhaData[] = [
  {
    id: 0,
    label: "Fagulha #",
    level: "ALPHA",
    size: "2.4 MB",
    artwork: artwork1,
    lampada: lampada1,
    idCode: "3D 7A 1F 62",
    ...CENSURADO_1,
  },
  {
    id: 1,
    label: "Fagulha #",
    codename: "Copas",
    level: "BETA",
    size: "1.1 MB",
    artwork: artwork2,
    lampada: lampada2,
    idCode: "8C 44 2E 91",
    nome: "████████",
    status: "56 69 76 6F", 
    classificacao: "70 65 6e 73 61 74 69 76 6f", 
    bio: `> IDADE: ████████ | ALTURA: ████████ (o mais baixo entre os Fagulhas)\n\nÉ um ser humanoide com grandes orelhas felinas, focinho branco e um rabo longo e ágil. Raramente é visto sem seu chapéu, e afirma ter grande apreço por camisas sociais e gravatas-borboleta. Passa a maior parte do tempo recluso em ████████████████, fazendo visitas constantes a █████████████████████████████. O codinome "Copas" foi atribuído pelo apego a cartas e pelos diversos formatos de coração ███████████████████████.`,
    notas: `Demonstra grande interesse pelos jogos disponíveis em seu quarto e possui notável talento na produção de alimentos, bebidas e pinturas em tela.
    Comunica-se pouco, preferindo observar antes de tirar conclusões, mas quando questionado, responde com total sinceridade, mesmo quando a avaliação é negativa. Sente-se mais tranquilo em █████████████████████████████████████. Gosta da cor ████████ e de colecionar ██████; não gosta de ser ██████, de ████████████████████, de sair do quarto ou que mexam em seus pertences.
    Costuma agir como se os demais Fagulhas fossem barulhentos e elétricos demais, mas está sempre disposto a protegê-los, chegou a ceder suas █████ e ██████ para outro Fagulha que se sentia solitário.
    Durante ████████████, coopera apenas quando deseja e reage com █████████████ quando perde o controle da situação; teme, acima de tudo, perder sua █████████████████. Demora para confiar nas pessoas e permanece calado até que essa confiança seja construída, raramente agindo por impulso, exceto quando ███████ ██ █████████, onde se torna mais espontâneo e foi ouvido cantarolando jazz antigo enquanto desenha. Confia em ███████ desde que se entende por gente, ainda que carregue o receio de que ele possa ████████████████████████████████████.`,
    registros: `Rotina conhecida: permanência quase integral ███████████████, uso frequente dos jogos disponíveis em ██████████████████ e visitas recorrentes ██████████.`
  },
  {
    id: 2,
    label: "Fagulha #",
    codename: "F-###",
    level: "GAMMA",
    size: "3.3 MB",
    artwork: artwork3,
    lampada: lampada3,
    idCode: "5F 12 9B 3A",
    ...CENSURADO_2,
  },
  {
    id: 3,
    label: "Fagulha #",
    codename: "Vigia",
    level: "DELTA",
    size: "19.2 MB",
    artwork: artwork4,
    lampada: lampada4,
    idCode: "4B 8F 22 D6",
    nome: "████████",
    status: "56 69 76 6F", 
    classificacao: "70 6F 73 73 69 76 65 6C 20 61 73 73 69 73 74 65 6E 74 65 3F",
    bio: `> IDADE: █/█ anos | ALTURA: █████\n\nSujeito de aparência infantil responsável pela observação contínua das demais Fagulhas. 
    Mantém laços estreitos com ████████████████. Informações adicionais sobre sua origem permanecem ███████████████████.`,
    notas: `Aversão a ███████████████, ██████ elevados e █████████ █████ altas. 
    Valoriza coleta de ███████████ e ███████. Protocolos completos de comportamento seguem classificados.`,
    registros: `Rotina parcialmente confirmada: desperta antes dos demais indivíduos, ocupa pontos elevados para observação e registra padrões comportamentais. 
    O restante da rotina permanece ███████████████████████.`
  },
  {
    id: 4,
    label: "Fagulha #",
    codename: "Princesa",
    level: "ALPHA",
    size: "8.7 MB",
    artwork: artwork5,
    lampada: lampada5,
    idCode: "9E 71 3C 05",
    nome: "██████",
    status: "56 69 76 6F",
    classificacao: "64 6F 63 69 6C",
    bio: `> IDADE: ██ anos | ALTURA: █,██m\n\nReside em ██████████████████████████████████. 
    Enxerga "Princesa" como seu cargo de realeza. 
    
    Informações sobre sua origem permanecem ███████████████████.
    Anteriormente era tutelada por um ████████, posteriormente ██████████████████. 
    Desde então vive isolada, permitindo visitas ocasionais apenas █████████████████.`,
    notas: `Possui percepção e escrita espelhadas. Reage com █████████████ ao ser observada, ██████████████████████████ olhos. Demonstra aversão severa ████████. Aprecia a cor rosa, pintura e atividades artísticas. Costuma ser encontrada █████████████████████████████.`,
    registros: `Evento principal: Neutralização do █████████████. Rotina conhecida: reclusão ███████, produção artística, ███████████████ e caminhadas pelos arredores.`
  },
  {
    id: 5,
    label: "Fagulha #",
    codename: "Encharcado",
    level: "OMEGA",
    size: "512 KB",
    artwork: artwork6,
    lampada: lampada6,
    idCode: "2A 6D 4F 88",
    nome: "████████",
    status: "56 69 76 6F",
    classificacao: "6D 6F 6C 68 61 64 6F",
    bio: `> IDADE: █ anos | ALTURA: █,██m\n\nEntidade humanoide de pele roxa semelhante a uma sombra. Traja roupas com padronagem ███████ e carrega constantemente uma ████████ contendo um █████. Demonstra comportamento extremamente alegre, embora registros indiquem ███████████████████████.`,
    notas: `Apresenta fobia intensa ██████. Obsessão por magia e organização simétrica. Forte instinto protetor em relação a outras crianças. O funcionamento completo de seu sistema ███████ permanece classificado.`,
    registros: `Evento histórico: "A Mudança". Rotina observada: alimentação, exploração de ██████████, ███████████████████████ e retorno ao ponto de descanso.`
  },
];

export function buildFileContent(fagulha: FagulhaData): string {
  return `> Inicializando conexão segura...
> Autenticando credenciais...
> Carregando perfil classificado...

█████████████████████████████████████

NOME ..................... ${fagulha.nome}
CODINOME ................. ${fagulha.codename}
ID ....................... ${fagulha.idCode}
STATUS ................... ${fagulha.status}
CLASSIFICAÇÃO ............ ${fagulha.classificacao}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BIO
─────────────────────────────────────
${fagulha.bio}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOTAS
─────────────────────────────────────
${fagulha.notas}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGISTROS
─────────────────────────────────────
${fagulha.registros}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FIM DO REGISTRO // ARQUIVO # // ${fagulha.label}`;
}