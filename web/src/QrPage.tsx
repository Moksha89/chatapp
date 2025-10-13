import React, { useEffect, useState } from "react";
import { postJson } from "./api";
import { store } from "./store";

export default function QrPage() {
  const [qr, setQr] = useState<{ token: string; qr_base64: string } | null>(null);
  const [confirmStatus, setConfirmStatus] = useState("");

  async function issue() {
    const data = await postJson("/api/link/qr-token", {}, undefined);
    setQr(data);
  }

  async function confirm() {
    if (!qr) return;
    try {
      const res = await postJson("/api/link/confirm", { token: qr.token }, store.token);
      setConfirmStatus("Linked");
      if (res?.access_token) store.setToken(res.access_token);
    } catch {
      setConfirmStatus("Invalid/expired");
    }
  }

  useEffect(() => {
    issue();
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h2>Link Device (QR)</h2>
      <div>
        {qr ? <img src={qr.qr_base64} style={{ width: 240, height: 240 }} /> : "Generating..."}
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={confirm} disabled={!qr || !store.token}>Confirm (simulate Android)</button>
        <div>{confirmStatus}</div>
      </div>
      <div style={{ marginTop: 12, color: "#555" }}>
        Token: {qr?.token}
      </div>
    </div>
  );
}
