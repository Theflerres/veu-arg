import { lazy } from "react";
import { createRoot } from "react-dom/client";
import { InspectViewer } from "./InspectViewer";
import type { ConfigPoses } from "./poser";
import { ABAS, GRUPO_OBJETOS, GRUPO_ROSTO, GRUPOS_PES, NOS_GRUPO, OBJETOS, RESPIRACAO, ROSTOS } from "./poses";
import "../styles/fonts.css";

// Página de TESTE da inspeção 3D (inspect/index.html) — só existe em
// `npm run dev`; a entrada não vai para o build (ver vite.config.ts).
//
// O modelo entra por glob com ?url: se o arquivo faltar, a página abre
// mesmo assim e o visualizador mostra o erro, em vez de o Vite quebrar.
const modelos = import.meta.glob<string>("./assets/bott/*.{gltf,glb}", {
  query: "?url",
  import: "default",
  eager: true,
});
const urlModelo = Object.values(modelos)[0] ?? "";

// Abas, poses, rostos e limites: ver poses.ts.
const POSES: ConfigPoses = {
  grupos: NOS_GRUPO,
  gruposPes: GRUPOS_PES,
  respiracao: RESPIRACAO,
  grupoRosto: GRUPO_ROSTO,
  rostos: ROSTOS,
  grupoObjetos: GRUPO_OBJETOS,
  objetos: OBJETOS,
};

// Editor de poses: só em DEV e com ?editor=1. Fora do DEV o import() some do
// código e o arquivo do editor nem entra no grafo do build.
const EditorPoses =
  import.meta.env.DEV && new URLSearchParams(location.search).get("editor") === "1"
    ? lazy(() => import("./EditorPoses"))
    : undefined;

createRoot(document.getElementById("root")!).render(
  <InspectViewer
    url={urlModelo}
    abas={ABAS}
    editor={EditorPoses}
    opcoes={{
      // O Blockbench exporta com a frente para -Z; a câmera fica em +Z.
      rotacaoInicialY: Math.PI,
      poses: POSES,
    }}
  />
);
