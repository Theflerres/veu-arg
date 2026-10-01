import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
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
      },
    },
  },
});
