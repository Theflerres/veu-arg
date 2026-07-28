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
  nome: string;
  status: string;
  classificacao: string;
  nivelAcesso: string;
  bio: string;
  notas: string;
  registros: string;
}

const PLACEHOLDER = {
  nome: "[NOME — edite aqui]",
  status: "[STATUS — edite aqui]",
  classificacao: "[CLASSIFICAÇÃO — edite aqui]",
  nivelAcesso: "[NÍVEL DE ACESSO — edite aqui]",
  bio: "[BIO — edite aqui. Descreva o sujeito, histórico e contexto.]",
  notas: "[NOTAS — edite aqui. Observações adicionais.]",
  registros: "[REGISTROS — edite aqui. Linha do tempo ou eventos.]",
};

export const FAGULHAS: FagulhaData[] = [
  {
    id: 0,
    label: "FAGULHA 1",
    codename: "F-001",
    level: "ALPHA",
    size: "2.4 MB",
    artwork: artwork1,
    lampada: lampada1,
    ...PLACEHOLDER,
  },
  {
    id: 1,
    label: "FAGULHA 2",
    codename: "F-002",
    level: "BETA",
    size: "1.1 MB",
    artwork: artwork2,
    lampada: lampada2,
    ...PLACEHOLDER,
  },
  {
    id: 2,
    label: "FAGULHA 3",
    codename: "F-003",
    level: "ALPHA",
    size: "8.7 MB",
    artwork: artwork3,
    lampada: lampada3,
    ...PLACEHOLDER,
  },
  {
    id: 3,
    label: "FAGULHA 4",
    codename: "F-004",
    level: "OMEGA",
    size: "512 KB",
    artwork: artwork4,
    lampada: lampada4,
    ...PLACEHOLDER,
  },
  {
    id: 4,
    label: "FAGULHA 5",
    codename: "F-005",
    level: "GAMMA",
    size: "3.3 MB",
    artwork: artwork5,
    lampada: lampada5,
    ...PLACEHOLDER,
  },
  {
    id: 5,
    label: "FAGULHA 6",
    codename: "F-006",
    level: "DELTA",
    size: "19.2 MB",
    artwork: artwork6,
    lampada: lampada6,
    ...PLACEHOLDER,
  },
];

export function buildFileContent(fagulha: FagulhaData): string {
  const n = fagulha.id + 1;
  return `> Inicializando conexão segura...
> Autenticando credenciais...
> Carregando perfil classificado...

█████████████████████████████████████

NOME ..................... ${fagulha.nome}
CODINOME ................. ${fagulha.label}
ID ....................... ${fagulha.codename}
STATUS ................... ${fagulha.status}
CLASSIFICAÇÃO ............ ${fagulha.classificacao}
NÍVEL DE ACESSO .......... ${fagulha.nivelAcesso}

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

FIM DO REGISTRO // ARQUIVO ${n} // ${fagulha.label}`;
}
