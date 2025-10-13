import React, { useEffect, useRef, useState } from "react";
import { getJson, postJson } from "./api";
import { store } from "./store";
import CallPanel from "./CallPanel";

type Conversation = { id: number; title: string; last_message?: string | null; unread_count: number };
type Message = { id: number; conversation_id: number; sender_id: number; body: string; created_at?: string };

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  async function loadConversations() {
    const convs = await getJson("/api/conversations", store.token).catch(() => []);
    setConversations(convs);
    if (convs.length && activeConv == null) setActiveConv(convs[0].id);
  }

  async function loadMessages(convId: number) {
    const msgs = await getJson(`/api/conversations/${convId}/messages`, store.token).catch(() => []);
    setMessages(msgs);
  }

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { if (activeConv != null) loadMessages(activeConv); }, [activeConv]);

  useEffect(() => {
    if (activeConv == null) return;
    if (wsRef.current) wsRef.current.close();
    const wsUrl = `ws://${location.host}/ws?conversation_id=${activeConv}&user=web`;
    const _ws = new WebSocket(wsUrl);
    _ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data && (data.type === "text" || data.type?.startsWith("call-"))) {
          loadMessages(activeConv);
        }
      } catch {}
    };
    wsRef.current = _ws;
    setWs(_ws);
    return () => { try { _ws.close(); } finally { setWs(null); } };
  }, [activeConv]);

  async function send() {
    if (!body.trim() || activeConv == null) return;
    await postJson("/api/messages", { conversation_id: activeConv, body }, store.token).catch(() => {});
    setBody("");
    if (activeConv != null) loadMessages(activeConv);
  }

  async function newChatWith(userId: number) {
    const msg = await postJson("/api/messages", { to_user_id: userId, body: "Hi" }, store.token).catch(() => null);
    await loadConversations();
    if (msg?.conversation_id) setActiveConv(msg.conversation_id);
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="topbar">
          <div className="brand">Chats</div>
          <div className="top-actions">
            <button className="icon-btn" title="New chat" onClick={() => newChatWith(2)}>+</button>
            <button className="icon-btn" title="Menu">⋮</button>
          </div>
        </div>
        <div className="search">
          <input placeholder="Search or start new chat" />
        </div>
        <div className="chatlist">
          {conversations.length === 0 ? (
            <div style={{ padding: 16, color: "var(--text-dim)" }}>No conversations yet</div>
          ) : null}
          {conversations.map(c => (
            <div key={c.id} className="chatitem" onClick={() => setActiveConv(c.id)}>
              <div className="avatar">{String(c.id).slice(-2).padStart(2, "0")}</div>
              <div>
                <div className="title">{c.title}</div>
                <div className="subtitle">{c.last_message || "No messages yet"}</div>
              </div>
              <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
                <div className="subtitle">now</div>
                {c.unread_count > 0 ? <span className="badge">{c.unread_count}</span> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="main">
        <div className="chat-header">
          <div className="avatar">{activeConv ?? "--"}</div>
          <div>
            <div className="title">{activeConv ? `Conversation ${activeConv}` : "Select a conversation"}</div>
            <div className="subtitle">online</div>
          </div>
          <div className="chat-actions">
            <button className="icon-btn" title="Audio call">📞</button>
            <button className="icon-btn" title="Video call">🎥</button>
            <button className="icon-btn" title="Screen share">🖥️</button>
            <button className="icon-btn" title="Info">ℹ️</button>
          </div>
        </div>

        <div className="messages">
          {activeConv == null ? (
            <div className="subtitle">Select a conversation</div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`msg ${m.sender_id % 2 === 0 ? "out" : "in"}`}>
                <div>{m.body}</div>
                <div className="time">{m.created_at ? new Date(m.created_at).toLocaleTimeString() : ""}</div>
              </div>
            ))
          )}
        </div>

        <div className="composer">
          <div className="callbar">
            <button className="icon-btn" title="Emoji">😊</button>
            <button className="icon-btn" title="Attach">📎</button>
            <button className="icon-btn" title="Voice note">🎤</button>
          </div>
          <div className="input-wrap">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a message"
              disabled={activeConv == null}
            />
          </div>
          <button className="send-btn" onClick={send} disabled={activeConv == null || !body.trim()}>Send</button>
        </div>

        {activeConv != null ? (
          <div className="video-strip">
            <div className="video" />
            <div className="video" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
