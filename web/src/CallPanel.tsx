import React, { useEffect, useRef, useState } from "react";
import { createPeer, getLocalMedia } from "./webrtc";

type Props = {
  conversationId: number;
  ws: WebSocket;
};

export default function CallPanel({ conversationId, ws }: Props) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [inCall, setInCall] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<any>(null);

  useEffect(() => {
    function onWs(ev: MessageEvent) {
      try {
        const msg = JSON.parse(ev.data);
        if (!msg?.type) return;
        if (msg.type === "call-offer") {
          setPendingOffer(msg.data);
        } else if (msg.type === "call-answer") {
          if (pcRef.current && msg.data) {
            pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.data));
          }
        } else if (msg.type === "call-candidate") {
          if (pcRef.current && msg.data) {
            pcRef.current.addIceCandidate(new RTCIceCandidate(msg.data));
          }
        } else if (msg.type === "call-end") {
          end();
        }
      } catch {
        /* ignore */
      }
    }
    ws.addEventListener("message", onWs);
    return () => ws.removeEventListener("message", onWs);
  }, [ws]);

  async function start() {
    const pc = createPeer(
      (c) => ws.send(JSON.stringify({ type: "call-candidate", data: c })),
      (e) => {
        if (remoteRef.current && e.streams[0]) {
          remoteRef.current.srcObject = e.streams[0];
        }
      }
    );
    pcRef.current = pc;
    const stream = await getLocalMedia(true, true);
    if (localRef.current) localRef.current.srcObject = stream;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: "call-offer", data: offer }));
    setInCall(true);
  }

  async function answer() {
    if (!pendingOffer) return;
    const pc = createPeer(
      (c) => ws.send(JSON.stringify({ type: "call-candidate", data: c })),
      (e) => {
        if (remoteRef.current && e.streams[0]) {
          remoteRef.current.srcObject = e.streams[0];
        }
      }
    );
    pcRef.current = pc;
    const stream = await getLocalMedia(true, true);
    if (localRef.current) localRef.current.srcObject = stream;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
    const answerSdp = await pc.createAnswer();
    await pc.setLocalDescription(answerSdp);
    ws.send(JSON.stringify({ type: "call-answer", data: answerSdp }));
    setPendingOffer(null);
    setInCall(true);
  }

  function end() {
    try {
      ws.send(JSON.stringify({ type: "call-end" }));
    } catch {}
    try {
      pcRef.current?.getSenders().forEach((s) => s.track?.stop());
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;
    if (localRef.current?.srcObject) {
      (localRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      localRef.current.srcObject = null;
    }
    if (remoteRef.current?.srcObject) {
      (remoteRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      remoteRef.current.srcObject = null;
    }
    setInCall(false);
    setPendingOffer(null);
  }

  return (
    <div style={{ borderTop: "1px solid #eee", paddingTop: 8, marginTop: 8 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={start} disabled={inCall}>Start Call</button>
        <button onClick={answer} disabled={!pendingOffer}>Answer</button>
        <button onClick={end} disabled={!inCall && !pendingOffer}>End</button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <video ref={localRef} autoPlay playsInline muted style={{ width: 200, height: 120, background: "#000" }} />
        <video ref={remoteRef} autoPlay playsInline style={{ width: 200, height: 120, background: "#000" }} />
      </div>
    </div>
  );
}
