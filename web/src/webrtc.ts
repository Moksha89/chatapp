export function rtcConfigFromEnv() {
  const url = (import.meta as any).env?.VITE_TURN_URL as string | undefined;
  const username = (import.meta as any).env?.VITE_TURN_USERNAME as string | undefined;
  const credential = (import.meta as any).env?.VITE_TURN_PASSWORD as string | undefined;
  const servers: RTCIceServer[] = [];
  if (url) {
    servers.push({ urls: [url], username, credential });
  }
  servers.push({ urls: ["stun:stun.l.google.com:19302"] });
  return { iceServers: servers };
}

export function createPeer(onIce: (c: RTCIceCandidateInit) => void, onTrack: (ev: RTCTrackEvent) => void) {
  const pc = new RTCPeerConnection(rtcConfigFromEnv());
  pc.onicecandidate = (e) => {
    if (e.candidate) onIce(e.candidate.toJSON());
  };
  pc.ontrack = onTrack;
  return pc;
}

export async function getLocalMedia(audio: boolean = true, video: boolean = true) {
  return navigator.mediaDevices.getUserMedia({ audio, video });
}
