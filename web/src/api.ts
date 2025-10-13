const API_URL = (import.meta as any).env.VITE_API_URL || "http://93.127.142.206";

export async function postJson(path: string, body: any, token?: string) {
  const r = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

export async function postForm(path: string, form: Record<string, string>) {
  const params = new URLSearchParams(form);
  const r = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

export async function uploadFile(path: string, file: File, token: string) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

export async function getJson(path: string, token: string) {
  const r = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

export async function patchJson(path: string, body: any, token: string) {
  const r = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}
export async function del(path: string, token: string) {
  const r = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!r.ok) throw new Error(`${r.status}`);
  try { return await r.json(); } catch { return { ok: r.ok }; }
}
