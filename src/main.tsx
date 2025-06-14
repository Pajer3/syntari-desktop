import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ContextMenuProvider } from "./components/ui/ContextMenu";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ContextMenuProvider>
      <App />
    </ContextMenuProvider>
  </React.StrictMode>,
);
