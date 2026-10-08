# Auditoria de debug/teste — 2026-10-01

Levantamento de tudo que é ferramenta de debug/teste no projeto e de onde cada coisa vaza (ou vazava) para o build de produção.

**Regra a partir de agora:** qualquer recurso de debug/teste fica dentro de `if (import.meta.env.DEV) { ... }`. No `npm run build`, o Vite troca `import.meta.env.DEV` por `false` e o minificador **apaga** o bloco: ele não existe no JS publicado. Em `npm run dev` tudo continua funcionando como antes.

Verificação: `npm run build:check` (build + [scripts/check-debug-leaks.js](scripts/check-debug-leaks.js)). O deploy do GitHub Actions agora roda esse comando: se algo vazar, o job falha e o site não é publicado.

---

## ⚠️ Antes de tudo: o repositório é público

`github.com/Theflerres/veu-arg` está **público**. Gatear com `import.meta.env.DEV` limpa o **site publicado**, mas todo o código-fonte continua legível no GitHub: os parâmetros, o painel, os comentários, o `CONFIG` do countdown com a sequência final inteira e a senha do terminal. Um jogador que achar o repositório lê tudo, sem precisar de DevTools.

Opções, da mais efetiva para a menos:
1. Tornar o repositório **privado**. No plano gratuito, o GitHub Pages exige repositório público. Para manter o Pages com repositório privado é preciso GitHub Pro, ou publicar o `dist/` em outro host (Netlify, Cloudflare Pages ou Vercel, todos com plano gratuito para repositório privado).
2. Manter o código público e aceitar o risco (e talvez tratar o repositório como mais uma camada do ARG).

Mesmo com o repositório privado, os itens da seção 6 continuam no JS publicado, porque o jogo precisa deles no navegador.

---

## 1. Parâmetros de URL

Todos ficam no countdown (`timer/index.html`, antes `public/timer/index.html`). O site React não lê nenhum parâmetro de URL.

| Parâmetro | O que faz | Onde | Status |
|---|---|---|---|
| `?debug=1` | Abre o painel de debug (seção 2) | `timer/index.html` ~L2605 | ✅ só em dev |
| `?fase=1\|2\|3` | Congela a fase narrativa, ignorando a data. Com `fase=3`, todo o lore e o código da fase 3 entram no sorteio | ~L1244 (`FASE_FORCADA`) | ✅ só em dev |
| `?final=1` | Dispara colapso, invasão e desligamento na hora, sem esperar o zero (**a sequência final inteira**) | ~L2950 | ✅ só em dev |
| `?marco=7d\|3d\|24h\|1h\|10m` | Mostra o texto de um marco antes da hora | ~L2963 | ✅ só em dev |
| `?resetmarcos=1` | Apaga o registro de marcos vistos (localStorage) | ~L2957 | ✅ só em dev |
| `?codigo=1..12` | Digita o trecho de código N, inclusive os da fase 3 | ~L2972 | ✅ só em dev |
| `?travar=1` | Força a tela do P3 de "relógio manipulado" | ~L3400 | ✅ só em dev |
| `?eco=<chave>` | **Recurso de produção, não é debug.** Abre a tela de reconhecimento pessoal (`src/app/components/EcoScreen.tsx`). O código guarda só o SHA-256 da chave. Os textos e o áudio estão cifrados com a chave (XOR). O áudio publicado é `public/sounds/eco-02.bin`. O mp3 original fica em `audio-original/`, que está no `.gitignore` | `src/app/App.tsx` (root) | Intencional, fica em produção |
| `?egg=` | **Não existe na versão atual.** Só aparece em `Countdownlive/p3-terminal-countdown.html` (versão antiga, fora do build, mas versionada no git; ver seção 7) | — | n/a |

Antes da mudança, **todos funcionavam em produção**: `https://theflerres.github.io/veu-arg/timer/?final=1` mostrava o final da live para qualquer um.

## 2. Painéis de debug visíveis na UI

| Item | Onde | Status |
|---|---|---|
| Painel `#debug-panel` (canto superior direito), com os botões lore, math, vídeo, transferência, replay do boot, **final: invasão**, glitch, modo de corrupção, travar glitch, pulso na rede e reset, mais uma linha de estado com fase, dias restantes e estado da state machine | `timer/index.html` ~L2594–2842 | ✅ só em dev, e só com `?debug=1` |

Os easter eggs do site (relógio no canto que abre o countdown, ícone que abre o Arquivo Secreto, Hunter West no Scanner) **são parte do jogo**, não debug. Continuam no build.

## 3. Funções expostas em `window` (chamáveis pelo console)

| Objeto | Funções | Onde | Status |
|---|---|---|---|
| `window.P3Terminal` | `setTargetDate(iso)` (muda o alvo do countdown), `runEnding()` (roda o final), `abortEnding()`, `faseAtual()`, `diasRestantes()`, `testarBloqueio()` | `timer/index.html` ~L3412 | ✅ só em dev |
| `window.debugARG` | `triggerChat()` (força o chat do terminal agora: sorteia como o agendador, inclusive as variantes de deslize que o visitante já pode ver), `resetTimer()`, `getAccumulatedMinutes()` | `src/app/arg-engine.ts` ~L142 | ✅ só em dev |
| `window.testeInterceptacao` | `abrir()` (abre a Interceptação Austin → Hunter na hora, sem contar disparo), `zerar()` (apaga contador e cooldown), `estado()` | `src/app/components/Interceptacao.tsx` | ✅ só em dev |
| `window.testeBott` | `abrirHub()` (abre o hub), `abelha()` (solta a abelha rara na hora, sem contar aparição — só no terminal, depois da senha), `chat(n)` (abre a variante de deslize n de `src/app/bott-chat-data.ts` no chat do terminal, `ChatWidget`, ignorando data, contador e "uma vez por visitante" — só no terminal, depois da senha; variante sem texto mostra `[TEXTO A ENVIAR]`), `nivel(n)` (abre o hub disparando o degrau n na hora, ignorando data e gatilho; 4 = camada final; 0 zera), `estado(e)` (sobrepõe `ESTADO_MUNDO`: `"desconhecido"`, `"nao-contaram"`, `"contaram"`), `zerar()` (apaga todas as chaves `veu-bott-*`), `sigla()` (no hub, mostra de novo o cartão de orientação da entrada, sem a abelha), `piscaSigla(ms?)` (no hub, faz o trecho "ASSISTENTE PESSOAL DE P3" do cabeçalho piscar agora; padrão `SIGLA_PISCA_MS.nivel2`), `noventaENove()` (no hub, leva a barra de progresso do DIAGNÓSTICO ao último degrau ignorando o teto do dia e dispara a cena do 99% na hora, sem respeitar os limites por visita/dia; grava a chave de teste `veu-bott-teto-teste`) | `src/app/bott-teste.ts` (registrado em `src/bott/main.tsx`, `src/app/components/AbelhaRara.tsx` e `src/app/components/ChatWidget.tsx`) | ✅ só em dev |

Além disso, antes da mudança o script do countdown era um `<script>` clássico, então **todas** as funções e constantes dele (`CONFIG`, `startEnding`, `bloqueia`, `relogio`…) eram globais e alcançáveis pelo console. Agora o script é `type="module"`: nada vaza para `window` sem atribuição explícita.

### Hub da Bott (`bott/index.html`, `src/bott/`, `src/app/bott-*.ts`)

- Chaves de teste no localStorage, lidas só dentro de `import.meta.env.DEV`: `veu-bott-estado-teste` (sobreposição do estado do mundo), `veu-bott-forca-nivel` (degrau forçado pelo `testeBott.nivel`) e `veu-bott-teto-teste` (barra sem teto, pelo `testeBott.noventaENove`). No build, as duas strings nem existem.
- Slots de texto vazios mostram `[TEXTO A ENVIAR]` **só em dev**. No build, slot vazio = o evento não acontece (e o degrau não conta como visto).
- Chat do terminal, variantes de deslize (`src/app/bott-chat-data.ts`): linha sem texto vira `[TEXTO A ENVIAR]` **só em dev**. No build, variante com alguma linha vazia não entra no sorteio.
- Log `[bott] testeBott: …` no console ao abrir o hub: só em dev.
- O checador também barra **termos ocultos**: palavras que não podem aparecer em lugar nenhum do repositório, nem no próprio script. Os padrões ficam em base64 em `OCULTOS` (`scripts/check-debug-leaks.js`) e são procurados no build normalizado (sem acentos, sem escapes `\uXXXX`/`\xXX`/`&#NNN;`, em maiúsculas). Para acrescentar um: `node -e "console.log(Buffer.from(process.argv[1]).toString('base64'))" "PADRAO_REGEX"`.
- O checador barra no build: `testeBott`, `estado-teste`, `forca-nivel`, `TEXTO A ENVIAR`, `Dott` e `TRAÇA` (também nas formas escapadas `\u00c7`, `\xc7`, `&#199;`, `&Ccedil;`).

## 4. `console.log` / `console.warn`

| Mensagem | Onde | Sensível? | Status |
|---|---|---|---|
| `[P3] modo debug ativo`, `fase forçada por ?fase=`, `?final=1 — disparando…`, `?marco=…`, `?codigo=…`, `?resetmarcos=1…`, `?travar=1…` | `timer/index.html` (blocos de teste) | **Sim**: ensinam os parâmetros a quem abre o console | ✅ só em dev |
| `[ARG] window.debugARG pronto — triggerChat() · resetTimer()` | `src/app/arg-engine.ts` | **Sim**: anunciava o atalho em todo carregamento, em produção | ✅ só em dev |
| `[grupos] nome repetido em …` | `src/app/grupos-membros-data.ts` ~L171 | Não (aviso de dados duplicados) | ✅ só em dev (é ajuda de desenvolvimento) |
| `[P3] horário verificado com o servidor · desvio…`, `relógio do sistema saltou…`, `verificação de horário indisponível…` | `timer/index.html` ~L3030–3070 | Não revela conteúdo, mas mostra que existe uma checagem de relógio | Mantido: útil para diagnosticar o OBS na live |
| `[P3] vídeo ignorado`, `imagem de fagulha ignorada`, `vídeo final ignorado`, `cancelEvent falhou` | `timer/index.html` | Não (nomes de arquivo de assets públicos) | Mantido: diagnóstico do OBS |
| `console.log(data);` | `timer/index.html` L1213 | Não é log: é **texto** de um trecho de código exibido na tela (`codeEntries`) | n/a |

## 5. Comentários que mencionam respostas/soluções

Comentários de JS/TS **somem no build** (o minificador remove), mas continuam no repositório público.

| Comentário | Onde | Revela |
|---|---|---|
| `("56 69 76 6F" = Vivo), é puzzle pro chat` | `timer/index.html` ~L1020 | Resolve o puzzle hex do status das Fagulhas |
| `// ARQUIVO SECRETO — Hunter West + Austin` e `a história do Austin` / `a menção ao Austin fica censurada (████)` | `src/app/arquivo-secreto-data.ts` L2, L12, L38 | Nome do segundo perfil censurado e de quem está por trás do `████` nos registros do Hunter |
| `{/* Arquivo secreto (Hunter West + Austin) em tela cheia */}` | `src/app/App.tsx` ~L1161 | Idem |
| Comentários do `CONFIG.ending` / `invasionLines` ("Não é uma invasão: é a revelação de que o acesso sempre esteve aberto…") | `timer/index.html` ~L920 | Explica o significado do final |
| `// Dossiê das Fagulhas. Mantido no código … fora de exibição` | `src/app/App.tsx` ~L310 | Que existe conteúdo pronto e não exibido |

Comentários de HTML/CSS **não** são removidos pelo Vite: o `<style>` do countdown vai para `dist/timer/index.html` como está. Dois deles citavam o painel de debug e foram reescritos. Os ~40 que sobraram descrevem só visual (CRT, rede, boot) e a tela de "relógio manipulado". O script de checagem barra qualquer comentário novo que mencione debug.

## 6. Conteúdo não revelado que continua no build (por necessidade)

Isto **não é debug**: é conteúdo do jogo que precisa estar no navegador para funcionar. Gatear não resolve. Ficam listados para você decidir:

| O quê | Onde no build | Observação |
|---|---|---|
| ~~**Senha do terminal `p3luche`** em texto puro~~ | `assets/main-*.js` (de `App.tsx`) | ✅ Resolvido: o código guarda só o SHA-256 das duas grafias aceitas e compara hashes (`crypto.subtle`). Não impede força bruta, mas tira a comparação da busca por texto. Atenção: "P3LUCHE" continua no bundle como **nome do personagem** do chat (`chat-dialogues.ts`) |
| `CONFIG` do countdown inteiro: lore e código das fases 2 e 3, marcos, `invasionLines`, banner `HORA DE ACORDAR`, "09/10" | `assets/timer-*.js` | Antes ficava num HTML legível, com comentários. Agora está minificado e sem comentários, mas os textos continuam lá. Sem servidor (GitHub Pages é estático), a única saída é ofuscar/codificar os textos |
| ~~`id: "austin"` do segundo perfil do Arquivo Secreto~~ | `assets/main-*.js` | ✅ Resolvido: agora é `"registro-02"`. O id só era usado como React key. Os **comentários** que citam o Austin (seção 5) continuam no repositório, mas não vão para o build |
| Bio completa do Hunter West (`Espiralium`, Torre de Memórias…) | `assets/main-*.js` | Já é exibida no Arquivo Secreto. Só é spoiler se o easter egg ainda não foi achado |
| Senhas dos grupos (`ALPHA-7F3K-01`…) | `assets/main-*.js` | São digitadas sozinhas na tela, não são segredo |
| Textos do hub da Bott (falas, pensamentos, checklist, log, sigla pública e cartão de orientação da entrada) | `assets/bott-*.js` | Em texto puro: são exibidos a qualquer visitante do hub. A outra leitura da sigla (`SIGLA_B`, em `src/app/bott-data.ts`) fica cifrada como os slots e só é decifrada quando pisca no cabeçalho. Os textos de evento (slots em `src/app/bott-data.ts`) ficam **cifrados** (XOR + base64, chave no próprio código, mesmo esquema da Interceptação): não são legíveis por busca de texto no repositório nem no JS publicado, mas quem ler o código consegue decifrar |
| URL do hub (`<base>/bott/`) | `dist/bott/index.html` | Acessível direto por quem souber o caminho, como o countdown. A abelha, o nível 1 e as variantes de deslize do chat valem a partir de `BOTT_ABERTURA` (08/10/2026, pela hora do servidor; sem rede, pelo relógio local), mas a página em si não é bloqueada por data |

## 7. Arquivos de teste versionados fora do build

`.gitignore` lista `Countdownlive/`, mas os arquivos foram commitados antes e **continuam no repositório público**:

- `Countdownlive/_repro.html`, `_teste_mec.html`, `_teste_video.html`: páginas de teste
- `Countdownlive/p3-terminal-countdown.html`: versão antiga do countdown, com `?debug`, `?egg` e easter eggs de chat que não existem mais
- `Countdownlive/p3-glitch-caos.html`

✅ Resolvido no commit `def3e948` (`git rm -r --cached Countdownlive`): a pasta não é mais rastreada e continua no disco. **Os commits antigos ainda contêm esses arquivos**, e quem navegar no histórico do GitHub ainda os encontra. Para apagar de vez é preciso reescrever o histórico (`git filter-repo`) e fazer force push.

`CIFRAS.md` está no `.gitignore` e **não** está versionado. ✅

---

## O que mudou

| Arquivo | Mudança |
|---|---|
| `public/timer/index.html` → `timer/index.html` | Tudo em `public/` é copiado para o `dist/` **sem passar pelo Vite**, então `import.meta.env.DEV` nunca seria trocado lá. A página virou a segunda entrada do Vite (`rollupOptions.input`), com `<script type="module">`. A URL continua a mesma (`/veu-arg/timer/`), e os assets continuam em `public/timer/assets/` |
| `timer/index.html` | `FASE_FORCADA`, o painel `?debug`, os atalhos de query string, o `?travar` e o `window.P3Terminal` estão atrás de `import.meta.env.DEV`. Dois comentários de CSS/HTML que citavam o debug foram reescritos |
| `src/app/arg-engine.ts` | `window.debugARG` e o log dele só em dev |
| `src/app/grupos-membros-data.ts` | Aviso de nome repetido só em dev |
| `vite.config.ts` | `build.sourcemap: false` explícito, mais a entrada `timer` |
| `scripts/check-debug-leaks.js` | Novo. Varre `.js/.html/.css` do `dist/` e falha (exit 1) se achar algum padrão |
| `package.json` | `check:leaks` e `build:check` (`npm run build && npm run check:leaks`) |
| `.github/workflows/deploy-pages.yml` | O deploy roda `build:check` em vez de `build` |
| `vite.config.ts` (hub da Bott) | Terceira entrada, `bott` → `bott/index.html` (página React própria em `src/bott/`) |
| `scripts/check-debug-leaks.js` (hub da Bott) | Padrões novos: `testeBott`, `estado-teste`, `forca-nivel`, `TEXTO A ENVIAR`, `Dott`, `TRAÇA` |
| `scripts/check-debug-leaks.js` (chat do terminal) | `testeBott.chat(n)` já é coberto por `testeBott`; padrão extra para o aviso que o atalho imprime no hub |

### Source maps
`build.sourcemap` não estava definido (padrão do Vite: `false`, sem `.map`). Agora está `false` explícito. O script de checagem também falha se encontrar qualquer `.map` ou `sourceMappingURL=` no `dist/`.

### O que o script procura
- `debug` (sem diferenciar maiúsculas), `P3Terminal`, `debugARG`, `testarBloqueio`
- `?debug`, `?fase`, `?final`, `?codigo`, `?marco`, `?resetmarcos`, `?travar`, `?egg`
- `.get("fase")` etc., que é a forma como os parâmetros aparecem depois de minificados (a minificação não deixa o `?` na frente)
- `.map` / `sourceMappingURL=`
- Exceção única: `useDebugValue`, hook do próprio React, presente em todo bundle de produção

Para cobrir um parâmetro novo, acrescente o nome em `PARAMS` no script.

### Como foi verificado
- `npm run build:check` → ✔ nenhum vazamento.
- Teste negativo: um build com `NODE_ENV=development` (blocos DEV mantidos) faz o script falhar com 90+ ocorrências, cobrindo todos os parâmetros, `P3Terminal` e `debugARG`.
- `npm run dev`: `/veu-arg/timer/` é servido com `DEV: true`, o código do painel está presente e os assets respondem 200.
- `vite preview` (build de produção) aberto no Edge headless: o countdown roda (relógio e contagem andando). Com `?debug=1&fase=3` não aparece painel nenhum. O site abre na tela de senha.
