import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Akirah Web</h1>
      <p>Scaffold ready.</p>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
