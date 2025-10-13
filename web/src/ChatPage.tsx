import React, { useEffect, useRef, useState } from "react";
import { getJson, postJson, patchJson } from "./api";
import { store } from "./store";
import CallPanel from "./CallPanel";

type Conversation = { id: number; title: string; last_message?: string | null; unread_count: number; pinned?: boolean; starred?: boolean; labels?: string[] };
type Message = { id: number; conversation_id: number; sender_id: number; body: string; created_at?: string };

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [openMsgMenuId, setOpenMsgMenuId] = useState<number | null>(null);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [body, setBody] = useState("");
  const [typing, setTyping] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [peerTyping, setPeerTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimer = useRef<number | null>(null);

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
        if (data?.type === "text") {
          if (activeConv != null) {
            loadMessages(activeConv);
            setConversations(prev => prev.map(c => c.id === activeConv ? { ...c, last_message: data.body, unread_count: 0 } : c));
          }
        } else if (data?.type === "typing-start") {
          setPeerTyping(true);
        } else if (data?.type === "typing-stop") {
          setPeerTyping(false);
        }
      } catch {}
    };
    wsRef.current = _ws;
    return () => { try { _ws.close(); } finally { wsRef.current = null; setPeerTyping(false); } };
  }, [activeConv]);

  function sendTyping(type: "typing-start" | "typing-stop") {
    if (!wsRef.current) return;
    try { wsRef.current.send(JSON.stringify({ type })); } catch {}
  }

  function onInputChange(v: string) {
    setBody(v);
    if (!typing) {
      setTyping(true);
      sendTyping("typing-start");
    }
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      setTyping(false);
      sendTyping("typing-stop");
    }, 1200);
  }

  async function send() {
    if (!body.trim() || activeConv == null) return;
    await postJson("/api/messages", { conversation_id: activeConv, body }, store.token).catch(() => {});
    setBody("");
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    setTyping(false);
    sendTyping("typing-stop");
    if (activeConv != null) loadMessages(activeConv);
  }

  async function newChatWith(userId: number) {
    const msg = await postJson("/api/messages", { to_user_id: userId, body: "Hi" }, store.token).catch(() => null);
    await loadConversations();
    if (msg?.conversation_id) setActiveConv(msg.conversation_id);
  }

  async function togglePin(id: number) {
    try {
      const current = conversations.find(c => c.id === id);
      const nextPinned = !current?.pinned;
      const res = await patchJson(`/api/conversations/${id}`, {
        pinned: nextPinned,
        starred: current?.starred ?? false,
        labels: current?.labels ?? [],
      }, store.token);
      setConversations(prev => prev.map(c => c.id === id ? { ...c, pinned: !!res.pinned, starred: !!res.starred, labels: res.labels || [], last_message: res.last_message, unread_count: res.unread_count } : c));
    } catch {}
    setMenuOpenId(null);
  }
  async function toggleStar(id: number) {
    try {
      const current = conversations.find(c => c.id === id);
      const nextStar = !current?.starred;
      const res = await patchJson(`/api/conversations/${id}`, {
        pinned: current?.pinned ?? false,
        starred: nextStar,
        labels: current?.labels ?? [],
      }, store.token);
      setConversations(prev => prev.map(c => c.id === id ? { ...c, pinned: !!res.pinned, starred: !!res.starred, labels: res.labels || [], last_message: res.last_message, unread_count: res.unread_count } : c));
    } catch {}
    setMenuOpenId(null);
  }
  async function addLabelToActive(label: string) {
    if (activeConv == null) return;
    try {
      const current = conversations.find(c => c.id === activeConv);
      const nextLabels = Array.from(new Set([...(current?.labels || []), label]));
      const res = await patchJson(`/api/conversations/${activeConv}`, {
        pinned: current?.pinned ?? false,
        starred: current?.starred ?? false,
        labels: nextLabels,
      }, store.token);
      setConversations(prev => prev.map(c => c.id === activeConv ? { ...c, pinned: !!res.pinned, starred: !!res.starred, labels: res.labels || [], last_message: res.last_message, unread_count: res.unread_count } : c));
    } catch {}
    setLabelPickerOpen(false);
  }
  function toggleStarMessage(id: number) {
    setMessages(prev => prev.map(m => (m.id === id ? ({ ...m, body: m.body }) : m)));
    setOpenMsgMenuId(null);
  }
  function deleteForMe(id: number) {
    setMessages(prev => prev.filter(m => m.id !== id));
    setOpenMsgMenuId(null);
  }
  function replyTo(id: number) {
    setOpenMsgMenuId(null);
  }
  function forwardMsg(id: number) {
    setOpenMsgMenuId(null);
  }

  async function removeLabelFromActive(label: string) {
    if (activeConv == null) return;
    try {
      const current = conversations.find(c => c.id === activeConv);
      const nextLabels = (current?.labels || []).filter(l => l !== label);
      const res = await patchJson(`/api/conversations/${activeConv}`, {
        pinned: current?.pinned ?? false,
        starred: current?.starred ?? false,
        labels: nextLabels,
      }, store.token);
      setConversations(prev => prev.map(c => c.id === activeConv ? { ...c, pinned: !!res.pinned, starred: !!res.starred, labels: res.labels || [], last_message: res.last_message, unread_count: res.unread_count } : c));
    } catch {}
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
          <input placeholder="Search or start new chat" value={query} onChange={(e)=>setQuery(e.target.value)} />
        </div>
        <div className="chatlist">
          {conversations.length === 0 ? (
            <div style={{ padding: 16, color: "var(--text-dim)" }}>No conversations yet</div>
          ) : null}
          {conversations
            .slice()
            .filter(c => (c.title?.toLowerCase() || "").includes(query.toLowerCase()))
            .sort((a,b) => Number(b.pinned) - Number(a.pinned))
            .map(c => (
              <div key={c.id} className="chatitem" onClick={() => setActiveConv(c.id)}>
                <div className="avatar">{String(c.id).slice(-2).padStart(2, "0")}</div>
                <div>
                  <div className="title">
                    {c.title} {c.starred ? "★" : ""}
                  </div>
                  <div className="subtitle">{c.last_message || "No messages yet"}</div>
                </div>
                <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
                  <div className="subtitle">now</div>
                  {c.unread_count > 0 ? <span className="badge">{c.unread_count}</span> : null}
                </div>
                <div style={{ position: "absolute", right: 12, top: 10 }}>
                  <button
                    className="icon-btn"
                    title="More"
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }}
                  >⋮</button>
                </div>
                <div className={`chatmenu ${menuOpenId === c.id ? "open" : ""}`} onClick={(e)=>e.stopPropagation()}>
                  <button onClick={() => togglePin(c.id)}>{c.pinned ? "Unpin" : "Pin"}</button>
                  <button onClick={() => toggleStar(c.id)}>{c.starred ? "Unstar" : "Star"}</button>
                </div>
              </div>
          ))}
        </div>
      </div>

      <div className="main">
        <div className="chat-header">
          <div className="avatar">{activeConv ?? "--"}</div>
          <div>
            <div className="title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {activeConv ? `Conversation ${activeConv}` : "Select a conversation"}
              {(() => {
                const conv = conversations.find(c => c.id === activeConv);
                return conv?.starred ? <span className="label-chip">Starred</span> : null;
              })()}
            </div>
            <div className="subtitle">{peerTyping ? "typing…" : "online"}</div>
            {activeConv ? (
              <div className="labels" style={{ marginTop: 6 }}>
                {(conversations.find(c => c.id === activeConv)?.labels || []).map(l => (
                  <span key={l} className="label-chip" onClick={() => removeLabelFromActive(l)}>{l} ✕</span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="chat-actions">
            <button className="icon-btn" title="Search" onClick={() => setShowStarredOnly(false)}>🔎</button>
            <button className="icon-btn" title="Starred messages" onClick={() => setShowStarredOnly(v => !v)}>⭐</button>
            <button className="icon-btn" title="Audio call">📞</button>
            <button className="icon-btn" title="Video call">🎥</button>
            <button className="icon-btn" title="Screen share">🖥️</button>
            <button className="icon-btn" title="Info">ℹ️</button>
          </div>
          <div className="label-picker">
            <button className="icon-btn" title="Labels" onClick={() => setLabelPickerOpen(v => !v)}>🏷️</button>
            <div className={`label-dropdown ${labelPickerOpen ? "open" : ""}`} onClick={(e)=>e.stopPropagation()}>
              <button onClick={() => addLabelToActive("New")}>Add “New”</button>
              <button onClick={() => addLabelToActive("Pending")}>Add “Pending”</button>
              <button onClick={() => addLabelToActive("VIP")}>Add “VIP”</button>
            </div>
          </div>

        </div>
          <div className="label-picker">
            <button className="icon-btn" title="Labels" onClick={() => setLabelPickerOpen(v => !v)}>🏷️</button>
            <div className={`label-dropdown ${labelPickerOpen ? "open" : ""}`} onClick={(e)=>e.stopPropagation()}>
              <button onClick={() => addLabelToActive("New")}>Add “New”</button>
              <button onClick={() => addLabelToActive("Pending")}>Add “Pending”</button>
              <button onClick={() => addLabelToActive("VIP")}>Add “VIP”</button>
            </div>
          </div>


        <div className="messages">
          {activeConv == null ? (
            <div className="subtitle">Select a conversation</div>
          ) : (
            (showStarredOnly ? messages.filter(() => false) : messages).map(m => (
              <div key={m.id} className={`msg ${m.sender_id % 2 === 0 ? "out" : "in"}`} style={{ position: "relative" }}>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span>{m.body}</span>
                  <button className="icon-btn" title="More" onClick={(e)=>{e.stopPropagation(); setOpenMsgMenuId(openMsgMenuId===m.id?null:m.id);}}>⋮</button>
                </div>
                <div className={`msg-menu ${openMsgMenuId===m.id?"open":""}`} onClick={(e)=>e.stopPropagation()}>
                  <button onClick={()=>replyTo(m.id)}>Reply</button>
                  <button onClick={()=>forwardMsg(m.id)}>Forward</button>
                  <button onClick={()=>toggleStarMessage(m.id)}>Star</button>
                  <button onClick={()=>deleteForMe(m.id)}>Delete for me</button>
                </div>
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
              onChange={(e) => onInputChange(e.target.value)}
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
