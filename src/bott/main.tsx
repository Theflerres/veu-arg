import { createRoot } from "react-dom/client";
import { BottHub } from "./BottHub";
import { registraTesteBott } from "../app/bott-teste";
import "../styles/fonts.css";

// Hub da Bott — segunda página React do site (entrada `bott` no vite.config.ts).

if (import.meta.env.DEV) {
  registraTesteBott();
  console.info(
    "%c[bott] testeBott: abrirHub() · abelha() · chat(n) · nivel(n) · estado(e) · zerar() · sigla() · piscaSigla(ms?) · noventaENove() · inspecao()",
    "color:#FFB000"
  );
}

createRoot(document.getElementById("root")!).render(<BottHub />);
