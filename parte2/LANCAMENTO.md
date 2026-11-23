# Parte 2 — lançamento e liberação por data

Tudo aqui é público (o repositório é público). Nenhum nome de seção fechada, nenhuma resposta e nenhuma chave aparecem neste arquivo nem em `secoes.json`.

## Onde fica cada coisa

| O quê | Onde | Vai para o git? |
|---|---|---|
| Datas (transição + cada seção) | `parte2/secoes.json` | sim (só ids e datas) |
| Canário de cada seção | `parte2/canarios.json` | sim (marcas aleatórias, sem conteúdo) |
| Conteúdo da fase A (em claro) | `parte2/claro/<id>.json` | sim, **só no lançamento** (ver abaixo) |
| Texto-fonte das fases B e C | `parte2-fonte/<id>.json` | **não** (`.gitignore`) |
| Chaves (fases B, C e a chave do login) | `parte2-fonte/CHAVES.local.json` | **não** |
| Login: só sal + PBKDF2-SHA256 (600k iterações) da chave. Trocar: `node scripts/hash-login.mjs` e colar em `src/schrodinger/config.ts`; conferir com `--conferir` | `src/schrodinger/config.ts` | sim |
| Blobs cifrados (AES-256-CBC, PBKDF2 200k, sha256: os parâmetros do rádio) | `parte2-cifrado/*.bin` | sim |
| Conteúdo decifrado no build | `src/schrodinger/liberado/` | **não** (gerado no runner) |
| Índice do que está no ar | `public/liberadas.json` → `<site>/liberadas.json` | **não** (gerado no build) |

## Comandos

```sh
node scripts/cifrar-secoes.mjs          # depois de editar parte2-fonte/ ou trocar uma chave
node scripts/liberar-secoes.mjs         # o que o workflow roda antes do build
PARTE2_DATA_SIMULADA=2026-12-19T20:05 node scripts/liberar-secoes.mjs   # teste local de uma data
npm run build:check                     # build + varredura (inclui os canários)
```

Para ver uma seção B/C no `npm run dev`, rode o `liberar-secoes` com as chaves no ambiente (`PARTE2_KEY_B=… PARTE2_KEY_C=…`). No console do dev, `testeSchrodinger.agora("AAAA-MM-DDTHH:MM:00-03:00")` simula a hora do site e `testeSchrodinger.zerar()` apaga a transição vista e a sessão. Nada disso existe no build.

## Secrets (Settings → Secrets and variables → Actions)

- `PARTE2_KEY_B`: valor em `parte2-fonte/CHAVES.local.json`
- `PARTE2_KEY_C`: idem
- (`RADIO_KEY` continua como está)

Sem a Secret de uma fase, o build avisa e as seções dela continuam RECONECTANDO. Com uma chave errada, o build falha e nada é publicado.

## Como o site decide

- **Antes de `transicao`** (hora do servidor, `hora-confiavel.ts`): a raiz continua sendo o P3. O P3 também fica sempre em `<base>/p3/`.
- **Depois**: Sistema Schrödinger, com a transição só na primeira visita.
- **Cada seção** fica aberta só se o conteúdo dela entrou no build. Se a hora já passou mas o build novo ainda não chegou, a caixa mostra "sincronizando": o site consulta `liberadas.json` a cada 60 s e recarrega quando a seção aparece.

## Builds na hora certa

O workflow (`.github/workflows/deploy-pages.yml`) roda:

1. **De hora em hora, no minuto 17**: um job barato (sem Secrets, sem `npm ci`) compara as seções que já deviam estar abertas com o `liberadas.json` publicado e só builda se faltar alguma. O cron do GitHub pode atrasar bastante ou pular execuções, por isso há também os dois itens abaixo.
2. **Gatilho externo na hora exata** (recomendado nos dias de abertura). Escolha um:
   - **cron-job.org**: crie um job `POST https://api.github.com/repos/<dono>/<repo>/actions/workflows/deploy-pages.yml/dispatches` com:
     - cabeçalhos `Authorization: Bearer <TOKEN>`, `Accept: application/vnd.github+json` e `X-GitHub-Api-Version: 2022-11-28`;
     - corpo `{"ref":"main"}`;
     - horário: na hora da abertura + 2 min, e depois a cada 15 min durante aquele dia.
   - **Cloudflare Worker** com Cron Trigger: faz o mesmo `fetch` POST, com o token numa variável secreta do Worker.

   `<TOKEN>` é um *fine-grained personal access token* restrito a este repositório, só com a permissão **Actions: Read and write**, e com validade até o fim da Parte 2.
3. **Passo manual do dia**: na hora da abertura, abra *Actions → Deploy to GitHub Pages → Run workflow* (com `data_simulada` vazio) ou rode `gh workflow run deploy-pages.yml --ref main`. Depois de uns 3 a 5 min, confira `<site>/liberadas.json`: o id da seção precisa estar lá.

**Teste sem publicar**: *Run workflow* com `data_simulada=AAAA-MM-DD`. O build decifra como se fosse o fim daquele dia, roda a varredura e **não** publica nada.

## A fase A sem vazar antes da hora

A fase A fica em claro no repositório (`parte2/claro/`), e o código do próprio sistema (`src/schrodinger/`) também é legível no GitHub. Até o push, tudo fica num branch **local** (por exemplo `schrodinger`). O push é o lançamento.

**Alternativa**: cifrar também a fase A. Tire `"fonte": "claro"`, dê um `"blob"` à seção, ponha o texto em `parte2-fonte/` e crie a Secret `PARTE2_KEY_A` (o workflow já a repassa). O código do sistema continua legível, então o branch local segue sendo a forma segura.

## Lançamento da fase A — 23/11/2026 às 20:00 (Brasília)

Datas em `parte2/secoes.json`:

| O quê | Data |
|---|---|
| `transicao` e as seções da fase A | 2026-11-23T20:00:00-03:00 |
| Fases B e C | 2027-01-01T20:00:00-03:00 (provisória; nada com placeholder abre sozinho) |
| Último painel da fase C | um dia depois da fase C |

**A folga de teste do workflow.** Os passos novos do workflow só rodam no GitHub depois de um push, e o push torna o código público. Para ter tempo de corrigir sem expor a fase A no site, o plano empurra **15 min antes**:

- a raiz continua o P3 até as 20:00 (a virada é decidida no navegador, pela hora do servidor);
- o conteúdo da fase A não entra nesse build, porque a data ainda não chegou;
- o custo: o código fica legível no GitHub por uns 15 min antes da hora.

Se preferir zero exposição, pule o passo 19:45 e faça o push às 20:00: sem folga, mas sem código público antes.

### Até as 19:30
1. Secrets `PARTE2_KEY_B` e `PARTE2_KEY_C` criadas (valores em `parte2-fonte/CHAVES.local.json`). Elas não abrem nada antes de 2027, mas o build já as confere.
2. Ensaio local completo:
   ```sh
   PARTE2_DATA_SIMULADA=2026-11-23T20:05 node scripts/liberar-secoes.mjs   # põe a fase A no bundle
   npm run dev
   # no console do navegador (só existe no dev):
   #   testeSchrodinger.agora("2026-11-23T20:05:00-03:00")  → transição, login, painel
   #   testeSchrodinger.zerar()                             → ver a transição de novo
   node scripts/liberar-secoes.mjs   # volta ao estado real (nada liberado antes das 20h)
   npm run build:check               # tem que passar com o estado real
   git checkout -- dist              # dist/ tem arquivos versionados: não commitar o build
   ```
   Num build de produção (`vite preview`), antes das 20h a raiz mostra o P3 de propósito: a virada usa a hora real.
3. Commit no branch local `schrodinger`, sem push.
4. Deixe o gatilho externo pronto (cron-job.org ou Cloudflare) para **20:02** e depois a cada 15 min até 23:59.

### 19:45 — push com folga
5. `git switch main && git merge schrodinger && git push`
6. Acompanhe *Actions → Deploy to GitHub Pages*. Precisa ficar verde, e o passo "Liberar seções…" deve mostrar `vencidas: nenhuma`.
7. Abra o site: a raiz ainda é o P3; `/p3/`, `/timer/` e `/bott/` normais. Se algo quebrar, corrija e faça push de novo: ainda dá tempo.

### 20:00 — virada
8. Às 20:00:00 quem carregar a raiz já cai na transição e no login. As caixas da fase A aparecem como "sincronizando" até o build da hora chegar.
9. **20:01**: *Run workflow* (com `data_simulada` vazio) ou `gh workflow run deploy-pages.yml --ref main`. O gatilho externo das 20:02 é a reserva, e o cron das 20:17 é a terceira linha.
10. Por volta de **20:05**: `<site>/liberadas.json` precisa listar `00`, `01` e `05`. As páginas abertas recarregam sozinhas quando isso acontece.
11. Teste rápido: login com a chave, painel com 3 abertas e 4 "reconectando", 05 e 01 abrindo; no celular também.

### Se der errado
- **O build falhou na varredura**: o log diz qual padrão e qual arquivo. Não force a publicação. Corrija e faça push.
- **Nada da fase A depois de 20:10**: confira se o workflow das 20:01 rodou e se o passo "Liberar seções…" mostra `vencidas: 00, 01, 05`.
- **Voltar ao P3 às pressas**: mude `transicao` em `parte2/secoes.json` para uma data futura e faça push. A raiz volta a montar o P3, que segue intacto em `/p3/`.
