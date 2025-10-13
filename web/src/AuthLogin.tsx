import React, { useState } from "react";
import { postForm } from "./api";
import { store } from "./store";

export default function AuthLogin({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await postForm("/api/auth/login", { username: email, password });
      store.setToken(res.access_token);
      onLoggedIn();
    } catch {
      setError("Login failed");
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "48px auto", fontFamily: "sans-serif" }}>
      <h2>Akirah Login</h2>
      <form onSubmit={onSubmit}>
        <div style={{ margin: "12px 0" }}>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>
        <div style={{ margin: "12px 0" }}>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>
        {error && <div style={{ color: "red" }}>{error}</div>}
        <button type="submit" style={{ padding: "8px 12px" }}>Login</button>
      </form>
    </div>
  );
}
