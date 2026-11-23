# Item 05.1 — modelo 3D (plano; nada implementado)

O item 05.1 só aparece a partir da sua data (fase B), dentro da seção 05, como **"MÓDULO ORBITAL · SEM SINAL"** (título e estado vêm do blob cifrado). Mais adiante ele pode ganhar um modo de inspeção 3D. Este arquivo é público: por isso usa só "módulo orbital / item 05.1", nunca o nome real do objeto.

## O que dá para reaproveitar do hub da Bott

| Peça | Onde | Serve? |
|---|---|---|
| Carregamento "só existe se o arquivo existir" | `src/bott/modelo.ts`: `import.meta.glob("./assets/bott.gltf", { query: "?url", eager: true })` devolve `{}` sem o arquivo, sem erro de build, e o botão some | **sim**: é o mesmo truque |
| Viewer three.js (cena, câmera, órbita, carga do glTF) | `src/inspect/InspectViewer.tsx`, `carga.tsx` | **sim**, extraído para um componente neutro |
| Pedaço baixado sob demanda | `lazy(() => import("./Inspecao"))` em `BottHub.tsx`: o three.js só baixa quando o modo abre | **sim** |
| HUD, rostos, poses, cena do 99%, cores verdes | `src/bott/Inspecao.tsx`, `poses.ts`, `estilo.ts` | **não**: é da Bott |
| Checagem de vazamento da página de teste | `check-debug-leaks.js` (`inspecao-teste`, `dist/inspect/`) | **sim**, com marcas novas |

**Proposta**: `src/schrodinger/componentes/Modulo3D.tsx`, carregado com `lazy()` e com o tema do Schrödinger (linhas finas azuis, sem CRT). Ele usa o viewer genérico e recebe a URL do modelo. Na seção 05, o botão INSPECIONAR só aparece quando o item 05.1 está liberado **e** existe modelo no build.

## Como o modelo fica fora do repo até a data

Escolher **uma** das duas:

**A. Arquivo fora do git até a data** (o mesmo esquema do `bott.gltf`)
- O arquivo fica em `src/schrodinger/assets/modulo/` e a pasta entra no `.gitignore`.
- O build do GitHub não tem o arquivo, então o glob devolve `{}` e o botão não aparece.
- No dia, `git add -f` do arquivo e push. Simples, mas depende de um push na hora certa, e o modelo fica no histórico para sempre a partir daí, o que é aceitável depois da data.

**B. Cifrado, decifrado só depois da data** (recomendado: segue o fluxo das seções)
- O modelo (de preferência `.glb`, um arquivo só, com as texturas embutidas) vai cifrado para `parte2-cifrado/<nome-opaco>.bin`, com a chave da fase do item (`PARTE2_KEY_B`) e os mesmos parâmetros AES.
- Em `parte2/secoes.json`, o item 05.1 ganha `"modelo3d": "<nome-opaco>.bin"`.
- `scripts/liberar-secoes.mjs` decifra o modelo **só se a data do item já chegou**, para `src/schrodinger/liberado/modelos/05.1.glb` (pasta no `.gitignore`).
- `Modulo3D` faz o glob eager com `?url` dessa pasta: sem o arquivo, `{}`, e nada aparece.
- `check-debug-leaks.js` passa a falhar se existir qualquer `.glb`/`.gltf` em `dist/` cujo item ainda esteja fechado. O canário vai num campo `extras` do glTF, e o hash do arquivo fica em `parte2/canarios.json`.
- O texto-fonte (o modelo original) fica em `parte2-fonte/` ou fora do projeto, nunca no git.

## Riscos do repo público

- **Histórico**: um único commit do modelo em claro, mesmo apagado depois, fica público para sempre (forks, clones, cache). No caminho A, nunca `git add -f` antes da data.
- **Metadados do glTF**: nomes de nós, malhas, materiais e animações, `asset.generator`, `extras` e nomes de arquivo de textura denunciam o objeto. Renomeie tudo para nomes neutros antes de cifrar ou publicar.
- **Tamanho e nome do blob**: um `.bin` muito maior que os outros denuncia "tem um modelo 3D aqui". Use nome opaco e commite junto com os outros blobs, bem antes. O tamanho não dá para esconder sem inflar todos os blobs; aceitar.
- **Código do viewer**: o componente `Modulo3D` e o three.js no bundle mostram que existe *algum* modo 3D na seção 05, mas não o quê. Se isso incomodar, o componente pode entrar no repo só na fase B.
- **Depois da data**: o modelo publicado em `dist/` pode ser baixado por qualquer um (como o da Bott). É o esperado.
- **Cache do CDN** (até ~10 min) e artefato do Pages: só existem depois da data, porque o build anterior não tem o arquivo.
- **Página de teste**: se for criada uma página de teste para o modelo, ela segue a regra da `inspect/` (só em `npm run dev`, barrada pela varredura).
