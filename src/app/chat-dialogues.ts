// ============================================================================
// CHAT_DIALOGUES — diálogos do chat do terminal (P3LUCHE vs Bott)
// ============================================================================
// A cada disparo do chat (agendador em arg-engine.ts) um diálogo é sorteado
// entre estes e as variantes de deslize de bott-chat-data.ts (ver
// components/ChatWidget.tsx). Estes podem repetir.
// `delay` é o tempo (ms) de "digitação" simulada antes da mensagem aparecer.
// `tipo` (opcional, padrão "normal"): "deslize" pinta a fala de âmbar, com
// tremor; a fala seguinte chega rápida e a janela fecha com um flash verde.

export interface ChatMessage {
  sender: "P3LUCHE" | "Bott" | string;
  text: string;
  delay: number;
  tipo?: "normal" | "deslize";
}

export interface ChatDialogue {
  id: string;
  messages: ChatMessage[];
}

export const CHAT_DIALOGUES: ChatDialogue[] = [
  {
    id: "event_01",
    messages: [
      { sender: "P3LUCHE", text: "Bott como está indo os relatórios?", delay: 1500 },
      { sender: "Bott", text: "Já estão prontos estou enviando eles agora para o senhor! :D ", delay: 2500 },
      { sender: "P3LUCHE", text: "Obrigado bott", delay: 2400 },
      { sender: "Bott", text: "Aliás uma pergunta. . . Notei que tivemos um registro de entrada no servidor vindo de um IP desconhecido. . . ", delay: 3000 },
      { sender: "Bott", text: "O senhor Montou uma nova Torre de memórias ?", delay: 3200 },
      { sender: "P3LUCHE", text: "Não. . .", delay: 2100 },
      { sender: "Bott", text: "Então isso é preocupante. . . ", delay: 2300 },
      { sender: "P3LUCHE", text: "Eu vou pessoalmente ver o que é isso obrigado bott.", delay: 2300 },
    ],
  },
  {
    id: "event_02",
    messages: [
      { sender: "Bott", text: "Senhor P3LUCHE, terminei a varredura nos módulos principais! Tudo rodando 100% :D", delay: 2000 },
      { sender: "P3LUCHE", text: "Ótimo trabalho, Bott. Encontrou algum fragmento residual no banco de dados?", delay: 2500 },
      { sender: "Bott", text: "Apenas alguns pacotes soltos no setor 4... Limpei tudo! ^^ Mas achei estranho, pareciam dados criptografados antigos.", delay: 3500 },
      { sender: "P3LUCHE", text: "Criptografados... Entendo.", delay: 1800 },
      { sender: "P3LUCHE", text: "Isole esses pacotes e não tente descriptografá-los.", delay: 2200 },
      { sender: "Bott", text: "Entendido! o_o Tem algo perigoso neles?", delay: 2100 },
      { sender: "P3LUCHE", text: "Apenas informações que ainda não devem ser acessadas. Fique seguro, Bott.", delay: 3000 },
    ],
  },
  {
    id: "event_03",
    messages: [
      { sender: "Bott", text: "P3LUCHE, os servidores estão com um pico de processamento absurdo! O senhor está rodando algum script pesado? :O", delay: 3200 },
      { sender: "P3LUCHE", text: "Sim. Estou compilando e filtrando uma nova remessa de informações.", delay: 2800 },
      { sender: "Bott", text: "Ah, entendi! Quer que eu aloque mais recursos para ajudar? Posso suspender os processos secundários! :3", delay: 3400 },
      { sender: "P3LUCHE", text: "Não é necessário. Você já faz o bastante mantendo a nossa rede estável.", delay: 3000 },
      { sender: "Bott", text: "Sempre às ordens! Qualquer coisa é só chamar! ^^", delay: 2000 },
      { sender: "P3LUCHE", text: "Aviso se precisar. Mantenha seus olhos nos firewalls.", delay: 2500 },
    ],
  },
  {
    id: "event_04",
    messages: [
      { sender: "Bott", text: "Senhor... Tivemos uma tentativa de acesso forçado nos arquivos restritos. Bloqueei imediatamente! >:(", delay: 3000 },
      { sender: "P3LUCHE", text: "De qual nó de rede partiu a tentativa?", delay: 2000 },
      { sender: "Bott", text: "Foi um roteamento fantasma, passou por três servidores proxy antes de bater na nossa barreira... Alguém está nos procurando.", delay: 3500 },
      { sender: "P3LUCHE", text: "Eles sempre estão.", delay: 1500 },
      { sender: "P3LUCHE", text: "Você fez bem em agir rápido.", delay: 1800 },
      { sender: "Bott", text: "Devo reforçar os protocolos de segurança e fechar as portas externas?", delay: 2800 },
      { sender: "P3LUCHE", text: "Sim. Ninguém entra sem o meu conhecimento. E Bott...", delay: 2500 },
      { sender: "P3LUCHE", text: "Cuidado com o que trafega na rede de fora. Não confie em pacotes sem assinatura.", delay: 3200 },
      { sender: "Bott", text: "Pode deixar, serei uma fortaleza! o7", delay: 1800 },
    ],
  },
  {
    id: "event_05",
    messages: [
      { sender: "Bott", text: "Senhor P3LUCHE, estou organizando os logs de ontem e notei um vazio de 4 minutos no servidor principal... :/", delay: 3500 },
      { sender: "P3LUCHE", text: "Eu pausei o registro durante esse período.", delay: 2000 },
      { sender: "Bott", text: "Oh... Eu achei que fosse uma falha no meu sistema de monitoramento! Fiquei preocupado. T_T", delay: 3000 },
      { sender: "P3LUCHE", text: "Seu sistema está perfeito, Bott. O erro não foi seu.", delay: 2200 },
      { sender: "Bott", text: "Entendi! Mas por que pausar os logs? Tem algo que não deve ser registrado? :x", delay: 3100 },
      { sender: "P3LUCHE", text: "Existem informações que não podem existir em nenhum banco de dados, nem mesmo nos nossos.", delay: 3400 },
      { sender: "Bott", text: "Copiado! Vou marcar o espaço como 'manutenção programada' então! ;)", delay: 2800 },
    ],
  }
];