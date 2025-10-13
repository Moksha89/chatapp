import React, { useEffect, useRef, useState } from "react";
import { getJson, postJson, patchJson, uploadFile } from "./api";
import { store } from "./store";
import CallPanel from "./CallPanel";

type Conversation = { id: number; title: string; last_message?: string | null; unread_count: number; pinned?: boolean; starred?: boolean; labels?: string[] };
type Message = { id: number; conversation_id: number; sender_id: number; body: string; created_at?: string; attachment_url?: string | null; attachment_mime?: string | null; reply_to_id?: number | null; deleted_for_everyone?: boolean; delivered?: boolean; seen?: boolean };

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
  const [showCreateModal, setShowCreateModal] = useState<null | "group" | "broadcast">(null);
  const [participantIdsInput, setParticipantIdsInput] = useState("");
  const [groupTitle, setGroupTitle] = useState("");


  const [peerTyping, setPeerTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const typingTimer = useRef<number | null>(null);

  async function loadConversations() {
    const convs = await getJson("/api/conversations", store.token).catch(() => []);
    setConversations(convs);
    if (convs.length && activeConv == null) setActiveConv(convs[0].id);
  }

  async function loadMessages(convId: number) {
    const msgs = await getJson(`/api/conversations/${convId}/messages`, store.token).catch(() => []);
    setMessages(msgs);
    try { await patchJson(`/api/conversations/${convId}/read`, {}, store.token); } catch {}
    await loadConversations();
  }


  useEffect(() => { store.load(); }, []);


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
  async function sendAttachment(file: File) {
    if (activeConv == null) return;
    try {
      const up = await uploadFile("/api/upload", file, store.token);
      await postJson("/api/messages", {
        conversation_id: activeConv,
        body: "",
        attachment_url: up.url,
        attachment_mime: up.mime,
      }, store.token);
      await loadMessages(activeConv);
    } catch {}
  }

  async function showStarred() {
    setShowStarredOnly(true);
    const starred = await getJson(`/api/starred`, store.token).catch(() => []);
    setMessages(starred);
  }
  function hideStarred() {
    setShowStarredOnly(false);
    if (activeConv != null) loadMessages(activeConv);
}

  async function doSearch() {
    if (showStarredOnly) {
      setShowStarredOnly(false);
    }
    if (activeConv != null && query.trim()) {
      const res = await getJson(`/api/conversations/${activeConv}/search?q=${encodeURIComponent(query)}`, store.token).catch(() => []);
      setMessages(res);
    } else if (activeConv != null) {
      await loadMessages(activeConv);
    }
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

  async function createConversation(kind: "group" | "broadcast") {
    const ids = participantIdsInput.split(",").map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n));
    if (!ids.length) return;
    const payload: any = { type: kind, title: groupTitle || null, participant_ids: ids };
    try {
      const conv = await postJson("/api/conversations", payload, store.token);
      setShowCreateModal(null);
      setParticipantIdsInput("");
      setGroupTitle("");
      await loadConversations();
      if (conv?.id) setActiveConv(conv.id);
    } catch {}
  }


  return (
    <div className="app">

      <div className="sidebar">
        <div className="topbar">
          <div className="brand">Chats</div>
          <div className="top-actions">
            <button className="icon-btn" title="New chat" onClick={() => newChatWith(6)}>+</button>
            <div className="dropdown" style={{ position: "relative" }}>
              <button className="icon-btn" title="Menu" onClick={() => setMenuOpenId(menuOpenId ? null : -1)}>⋮</button>
              <div className={`chatmenu ${menuOpenId === -1 ? "open" : ""}`} style={{ right: 12, top: 40 }}>
                <button onClick={() => { setShowCreateModal("group"); setMenuOpenId(null); }}>Create Group</button>
                <button onClick={() => { setShowCreateModal("broadcast"); setMenuOpenId(null); }}>Create Broadcast</button>
              </div>
            </div>

            <button className="icon-btn" title="Menu">⋮</button>
          </div>
        </div>
        <div className="search">
          <input placeholder="Search or start new chat" value={query} onChange={(e)=>setQuery(e.target.value)} onKeyDown={(e)=>{ if (e.key === "Enter") { e.preventDefault(); doSearch(); } }} />
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
            <button className="icon-btn" title="Search" onClick={() => doSearch()}>🔎</button>
            <button className="icon-btn" title="Starred messages" onClick={() => (showStarredOnly ? hideStarred() : showStarred())}>⭐</button>
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
            (messages).map(m => (
              <div
                key={m.id}
                className={`msg ${m.sender_id % 2 === 0 ? "out" : "in"}`}
                style={{ position: "relative" }}
                onContextMenu={async (e) => {
                  e.preventDefault();
                  const action = window.prompt("Action: reply | star | unstar | delme | deleveryone");
                  if (!action) return;
                  try {
                    if (action === "star") {
                      await patchJson(`/api/messages/${m.id}`, { star: true }, store.token);
                    } else if (action === "unstar") {
                      await patchJson(`/api/messages/${m.id}`, { star: false }, store.token);
                    } else if (action === "delme") {
                      await patchJson(`/api/messages/${m.id}`, { delete_for_me: true }, store.token);
                    } else if (action === "deleveryone") {
                      if (window.confirm("Delete for everyone?")) {
                        await patchJson(`/api/messages/${m.id}`, { delete_for_everyone: true }, store.token);
                      }
                    } else if (action === "reply") {
                      const text = window.prompt("Reply text:");
                      if (text && activeConv != null) {
                        await postJson("/api/messages", { conversation_id: activeConv, body: text, reply_to_id: m.id }, store.token);
                      }
                    }
                    if (activeConv != null) loadMessages(activeConv);
                  } catch {}
                }}
              >
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  {m.deleted_for_everyone ? (
                    <em>Message deleted</em>
                  ) : m.attachment_url ? (
                    m.attachment_mime && m.attachment_mime.startsWith("image/") ? (
                      <img src={m.attachment_url} alt="attachment" style={{ maxWidth: 240, borderRadius: 8 }} />
                    ) : (
                      <a href={m.attachment_url} target="_blank" rel="noreferrer">Download attachment</a>
                    )
                  ) : (
                    <span>
                      {m.reply_to_id ? <div className="reply-quote">Reply to #{m.reply_to_id}</div> : null}
                      {m.body}
                    </span>
                  )}
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, display: "flex", gap: 6, alignItems: "center", justifyContent: m.sender_id % 2 === 0 ? "flex-end" : "flex-start" }}>
                  {m.sender_id % 2 === 0 ? (
                    <span title={m.seen ? "Read" : m.delivered ? "Delivered" : "Sent"}>
                      {m.seen ? "✅✅" : m.delivered ? "✅✅" : "✅"}
                    </span>
                  ) : null}
                </div>

                </div>
                <div className="time">{m.created_at ? new Date(m.created_at).toLocaleTimeString() : ""}</div>
              </div>
            ))
          )}
        {showCreateModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "grid", placeItems: "center", zIndex: 50 }}>
            <div style={{ width: 420, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>{showCreateModal === "group" ? "Create Group" : "Create Broadcast"}</div>
              {showCreateModal === "group" && (
                <input value={groupTitle} onChange={e => setGroupTitle(e.target.value)} placeholder="Group title (optional)" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: 0, background: "var(--panel-light)", color: "var(--text)", marginBottom: 8 }} />
              )}
              <input value={participantIdsInput} onChange={e => setParticipantIdsInput(e.target.value)} placeholder="Participant user IDs, comma-separated (e.g., 2,3,4)" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: 0, background: "var(--panel-light)", color: "var(--text)", marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="icon-btn" onClick={() => { setShowCreateModal(null); setParticipantIdsInput(""); setGroupTitle(""); }}>Cancel</button>
                <button className="send-btn" onClick={() => createConversation(showCreateModal)}>{showCreateModal === "group" ? "Create Group" : "Create Broadcast"}</button>
              </div>
            </div>
          </div>
        )}

        </div>

        <div className="composer">
          <div className="callbar">
            <button className="icon-btn" title="Emoji">😊</button>
            <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={(e)=>{ const f = e.target.files?.[0]; if (f) sendAttachment(f); e.currentTarget.value=""; }} />
            <button className="icon-btn" title="Attach" onClick={()=>fileInputRef.current?.click()}>📎</button>
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
