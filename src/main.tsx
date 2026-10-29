import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./styles.css";
import "./app.css";
import "./atelier.css";
import "./discover.css";
import "./offer-cards.css";
import "./offer-conflicts.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
