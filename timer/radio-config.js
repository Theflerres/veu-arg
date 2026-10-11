/* ==========================================================================
   RÁDIO DO COUNTDOWN — edite aqui
   Durante o countdown o terminal às vezes "capta" uma transmissão. A lógica
   mora em timer/radio.js; aqui ficam só a lista de sinais e os números.

   SINAIS
     id        neutro e estável: é o que fica gravado no localStorage de quem
               já ouviu. Trocar o id de um sinal faz ele contar como novo.
     arquivo   relativo a public/sounds/ (no site: <base>/sounds/). Arquivo
               que não existe (404) é ignorado em silêncio: o sinal só entra
               no sorteio quando o .mp3 estiver publicado.
     liberaEm  instante a partir do qual o sinal pode tocar, pela hora do
               servidor (a mesma do countdown). Offset -03:00 explícito.
   A ordem da lista não aparece para o visitante: o painel numera os sinais
   na ordem em que CADA UM ouviu.
   ========================================================================== */
export const SINAIS = [
  { id: 's1', arquivo: 'radio/sinal-1.mp3', liberaEm: '2026-10-11T00:00:00-03:00' },
  { id: 's2', arquivo: 'radio/sinal-2.mp3', liberaEm: '2026-10-12T00:00:00-03:00' },
  { id: 's3', arquivo: 'radio/sinal-3.mp3', liberaEm: '2026-10-13T00:00:00-03:00' },
  { id: 's4', arquivo: 'radio/sinal-4.mp3', liberaEm: '2026-10-14T00:00:00-03:00' },
  { id: 's5', arquivo: 'radio/sinal-5.mp3', liberaEm: '2026-10-15T00:00:00-03:00' },
];

// ---- Sorteio automático ----
// De quanto em quanto tempo (±20%) o terminal tenta captar algo, com o timer
// aberto, a aba visível e o countdown parado no idle.
export const RADIO_INTERVALO_MS = 45000;
// Chance de cada tentativa captar um sinal (0–1).
export const RADIO_CHANCE = 0.2;
// Intervalo mínimo entre o início de dois sinais NOVOS (vale também para o
// botão SINTONIZAR). Reouvir pelo painel não conta.
export const RADIO_COOLDOWN_MS = 3 * 60 * 1000;

// ---- Botão SINTONIZAR (painel de sinais) ----
export const SINTONIA_CHANCE = 0.3;
export const SINTONIA_COOLDOWN_MS = 60000;

// ---- Som ----
export const RADIO_VOLUME = 0.9;            // volume do .mp3 (0–1)
export const ESTATICA_VOLUME = 0.16;        // chiado gerado pelo navegador
export const ESTATICA_MS = 1400;            // chiado antes de um sinal novo (reouvir usa metade)

// ---- Efeitos (public/sounds/fx/; arquivo ausente = mudo) ----
// fx-estatica-1 antes de cada sinal (sem o arquivo, volta o chiado gerado pelo
// navegador), fx-estatica-2 em loop baixinho sob a voz, fx-estatica-3 no
// SINTONIZAR e fx-sonar-ping quando um sinal NOVO é captado.
export const FX_VOLUME_ESTATICA_SINAL = 0.45;
export const FX_VOLUME_CAMA = 0.1;
export const FX_VOLUME_SINTONIA = 0.4;
export const FX_VOLUME_PING = 0.5;
export const FX_MAX_SIMULTANEOS = 2;

// Nenhum sinal COMEÇA com menos que isto até o zero: a tela e o som têm que
// estar livres para o marco de 10 min e para a sequência final.
export const RADIO_CORTE_FINAL_MS = 15 * 60 * 1000;

// Na Browser Source do OBS (window.obsstudio) o rádio fica desligado: ícone,
// painel e sorteio não existem no overlay da live. true liga também lá.
export const RADIO_NO_OBS = false;
