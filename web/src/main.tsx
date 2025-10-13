import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import AuthLogin from "./AuthLogin";
import ChatPage from "./ChatPage";
import QrPage from "./QrPage";
import { store } from "./store";

function App() {
  const [route, setRoute] = useState<"login" | "chat" | "qr">("login");

  useEffect(() => {
    store.load();
    setRoute(store.token ? "chat" : "login");
  }, []);

  return (
    <div>
      <div style={{ padding: 8, borderBottom: "1px solid #eee", display: "flex", gap: 12 }}>
        <b>Akirah</b>
        <a href="#" onClick={(e) => { e.preventDefault(); setRoute("chat"); }}>Chat</a>
        <a href="#" onClick={(e) => { e.preventDefault(); setRoute("qr"); }}>QR</a>
        <a href="#" onClick={(e) => { e.preventDefault(); store.clear(); setRoute("login"); }}>Logout</a>
      </div>
      {route === "login" && <AuthLogin onLoggedIn={() => setRoute("chat")} />}
      {route === "chat" && store.token && <ChatPage />}
      {route === "qr" && <QrPage />}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
