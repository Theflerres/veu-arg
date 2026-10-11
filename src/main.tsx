
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { registraTesteApagao } from "./app/apagao";
  import { registraTesteFx } from "./app/sounds";
  import "./styles/index.css";

  registraTesteApagao(); // só em dev (atalhos de console)
  registraTesteFx();

  createRoot(document.getElementById("root")!).render(<App />);
  