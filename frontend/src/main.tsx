import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { QueryProvider } from "./api/QueryProvider";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>,
);
