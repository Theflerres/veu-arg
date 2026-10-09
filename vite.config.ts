import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: "/veu-arg/",
  build: {
    // Explícito de propósito: source map no build de produção devolveria o
    // código original (nomes, comentários, blocos de debug) a quem abrir o
    // DevTools. scripts/check-debug-leaks.js também falha se achar um .map.
    sourcemap: false,
    rollupOptions: {
      // O countdown (timer/index.html) é uma página à parte, carregada no
      // iframe do TimerOverlay e direto pelo OBS. Ele passa pelo Vite — e não
      // fica em public/ — para que os blocos `import.meta.env.DEV` dele sejam
      // removidos do build como os do site.
      input: {
        main: resolve(__dirname, "index.html"),
        timer: resolve(__dirname, "timer/index.html"),
        // Hub da Bott: página React própria (src/bott/), em <base>/bott/.
        bott: resolve(__dirname, "bott/index.html"),
        // Página de TESTE da inspeção 3D (inspect/, editor de poses): só no
        // `npm run dev` (aqui ela serve para o Vite pré-empacotar o three.js).
        // No build fica de fora; o viewer vai ao ar só pelo modo de inspeção
        // do hub, num pedaço baixado sob demanda. scripts/check-debug-leaks.js
        // derruba o build se a página de teste ou o editor vazarem.
        ...(command === "serve" ? { inspect: resolve(__dirname, "inspect/index.html") } : {}),
      },
    },
  },
}));
