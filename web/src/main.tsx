import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Home } from "./Home";
import { PartyPage } from "./PartyPage";
import { partyCodeFromPath } from "./party";

const code = partyCodeFromPath(location.pathname);

createRoot(document.getElementById("root")!).render(
  <StrictMode>{code ? <PartyPage code={code} /> : <Home />}</StrictMode>,
);
