import { createRoot } from "react-dom/client";
import { BottHub } from "./BottHub";
import { registraTesteBott } from "../app/bott-teste";
import { registraTesteApagao } from "../app/apagao";
import { registraTesteFx } from "../app/sounds";
import { useApagao } from "../app/useApagao";
import { ApagaoScreen } from "../app/components/ApagaoScreen";
import "../styles/fonts.css";

// Hub da Bott — segunda página React do site (entrada `bott` no vite.config.ts).

registraTesteApagao(); // só em dev
registraTesteFx();

if (import.meta.env.DEV) {
  registraTesteBott();
  console.info(
    "%c[bott] testeBott: abrirHub() · abelha() · chat(n) · nivel(n) · estado(e) · zerar() · sigla() · piscaSigla(ms?) · noventaENove() · inspecao()",
    "color:#FFB000"
  );
}

// Apagão (src/app/apagao.ts): o hub inteiro — inspeção 3D inclusa — fica fora do ar.
function RaizBott() {
  const apagao = useApagao();
  if (apagao === "sim") return <ApagaoScreen />;
  if (apagao === "conferindo") return <div style={{ position: "fixed", inset: 0, background: "#000" }} />;
  return <BottHub />;
}

createRoot(document.getElementById("root")!).render(<RaizBott />);
