import React, { useEffect, useMemo, useRef, useState } from "react";
import { getJson, postJson } from "./api";
import { store } from "./store";

type Conversation = { id: number };
type Message = { id: number; conversation_id: number; sender_id: number; body: string };

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  async function loadConversations() {
    const convs = await getJson("/api/conversations", store.token);
    setConversations(convs);
    if (convs.length && activeConv == null) setActiveConv(convs[0].id);
  }

  async function loadMessages(convId: number) {
    const msgs = await getJson(`/api/conversations/${convId}/messages`, store.token);
    setMessages(msgs);
  }

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConv != null) loadMessages(activeConv);
  }, [activeConv]);

  useEffect(() => {
    if (activeConv == null) return;
    if (wsRef.current) wsRef.current.close();
    const wsUrl = `ws://${location.host}/ws?conversation_id=${activeConv}&user=web`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data && data.type === "text") {
          loadMessages(activeConv);
        }
      } catch {}
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [activeConv]);

  async function send() {
    if (!body.trim() || activeConv == null) return;
    await postJson("/api/messages", { conversation_id: activeConv, body }, store.token);
    setBody("");
    await loadMessages(activeConv);
  }

  async function newChatWith(userId: number) {
    const msg = await postJson("/api/messages", { to_user_id: userId, body: "Hi" }, store.token);
    await loadConversations();
    setActiveConv(msg.conversation_id);
  }

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ width: 240, borderRight: "1px solid #ddd", padding: 12 }}>
        <div style={{ marginBottom: 12, fontWeight: 600 }}>Conversations</div>
        <button onClick={() => newChatWith(2)} style={{ marginBottom: 12 }}>New chat with user 2</button>
        <div>
          {conversations.map(c => (
            <div key={c.id} onClick={() => setActiveConv(c.id)} style={{ padding: 8, cursor: "pointer", background: activeConv === c.id ? "#eef" : "transparent" }}>
              Conv #{c.id}
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, padding: 12, overflowY: "auto" }}>
          {activeConv == null ? <div>Select a conversation</div> :
            messages.map(m => (
              <div key={m.id} style={{ padding: "6px 0" }}>
                <b>{m.sender_id}</b>: {m.body}
              </div>
            ))
          }
        </div>
        <div style={{ borderTop: "1px solid #ddd", padding: 12, display: "flex", gap: 8 }}>
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message" style={{ flex: 1, padding: 8 }} />
          <button onClick={send}>Send</button>
        </div>
      </div>
    </div>
  );
}
