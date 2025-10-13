import React, { useEffect, useState } from "react";
import { getJson, postJson, del } from "./api";
import { store } from "./store";

type Device = { id: string; name: string };

export default function QrPage() {
  const [qr, setQr] = useState<{ token: string; qr_base64: string } | null>(null);
  const [confirmStatus, setConfirmStatus] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);

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
      await loadDevices();
    } catch {
      setConfirmStatus("Invalid/expired");
    }
  }

  async function loadDevices() {
    try {
      const list = await getJson("/api/link/devices", store.token!);
      setDevices(list);
    } catch {
      setDevices([]);
    }
  }

  async function revoke(id: string) {
    try {
      await del(`/api/link/devices/${id}`, store.token!);
      await loadDevices();
    } catch {}
  }

  useEffect(() => {
    issue();
    if (store.token) loadDevices();
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

      <h3 style={{ marginTop: 24 }}>Linked devices</h3>
      <div>
        {devices.length === 0 ? <div style={{ color: "#777" }}>No linked devices</div> : null}
        {devices.map(d => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>{d.name} • {d.id.slice(0,8)}</div>
            <button onClick={() => revoke(d.id)}>Revoke</button>
          </div>
        ))}
      </div>
    </div>
  );
}
