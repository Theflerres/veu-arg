// Modelo 3D da Bott para o modo de inspeção. O arquivo NÃO é versionado
// (src/bott/assets/*.gltf está no .gitignore): sem ele, o botão INSPECIONAR
// nem aparece. O glob devolve {} quando o arquivo falta — sem erro de build.

const principal = import.meta.glob<string>("./assets/bott.gltf", { query: "?url", import: "default", eager: true });

/** URL do modelo no build ("" se o arquivo não existir). */
export const URL_MODELO = Object.values(principal)[0] ?? "";

/**
 * URL do modelo para abrir o modo. Em `npm run dev`, sem o arquivo acima, cai
 * no modelo da página de teste (src/inspect/assets/bott/), servido direto pelo
 * Vite. Isso é uma URL simples checada em tempo de execução, e não um glob: um
 * glob, mesmo dentro de `import.meta.env.DEV`, entra no grafo do build e
 * publica o arquivo de teste.
 */
export async function procuraModelo(): Promise<string> {
  if (URL_MODELO) return URL_MODELO;
  if (import.meta.env.DEV) {
    const teste = `${import.meta.env.BASE_URL}src/inspect/assets/bott/bott.gltf`;
    try {
      const r = await fetch(teste, { method: "HEAD" });
      if (r.ok && /gltf|json/.test(r.headers.get("content-type") ?? "")) return teste;
    } catch {
      /* sem modelo de teste */
    }
  }
  return "";
}
