import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { socketService } from '../services/socket';

export type CallState = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended' | 'reconnecting';
export type CallType = 'audio' | 'video';

export interface CallHistoryEntry {
  id: string;
  peerId: string;
  peerName: string;
  callType: CallType;
  direction: 'incoming' | 'outgoing';
  status: 'answered' | 'missed' | 'rejected' | 'no-answer';
  duration: number;
  timestamp: string;
  isGroupCall?: boolean;
  participants?: string[];
}

export interface GroupCallParticipant {
  id: string;
  name: string;
  stream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
}

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

interface CallInfo {
  callId: string;
  peerId: string;
  peerName: string;
  callType: CallType;
  isOutgoing: boolean;
  isGroupCall?: boolean;
}

interface CallContextType {
  callState: CallState;
  callInfo: CallInfo | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
  callDuration: number;
  isScreenSharing: boolean;
  isRecording: boolean;
  isNoiseCancellation: boolean;
  connectionQuality: ConnectionQuality;
  callHistory: CallHistoryEntry[];
  groupParticipants: GroupCallParticipant[];
  isMinimized: boolean;
  initiateCall: (targetUserId: string, targetUserName: string, callType: CallType, chatId?: string) => Promise<void>;
  initiateGroupCall: (participantIds: string[], participantNames: string[], callType: CallType) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  toggleRecording: () => void;
  toggleNoiseCancellation: () => void;
  setIsMinimized: (v: boolean) => void;
  addParticipant: (userId: string, userName: string) => void;
  clearCallHistory: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

// Default ICE servers — will be overridden by backend-provided servers on socket connect
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  {
    urls: 'turn:208.110.87.24:3478',
    username: 'chatapp',
    credential: 'ChatAppTurn2024!',
  },
  {
    urls: 'turn:208.110.87.24:3478?transport=tcp',
    username: 'chatapp',
    credential: 'ChatAppTurn2024!',
  },
];

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isNoiseCancellation, setIsNoiseCancellation] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('unknown');
  const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('call-history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [groupParticipants, setGroupParticipants] = useState<GroupCallParticipant[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const qualityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  // Map of peer connections for group calls (keyed by participant userId)
  const groupPeerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const CALL_TIMEOUT_MS = 45000; // 45 second timeout for outgoing calls
  // Refs to prevent stale closures in socket event handlers
  const callStateRef = useRef<CallState>(callState);
  const callInfoRef = useRef<CallInfo | null>(callInfo);
  const callDurationRef = useRef(callDuration);
  const callIdRef = useRef<string>(''); // Track current callId for ICE candidates
  // Audio element ref for speaker toggle on audio-only calls
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  // ICE candidate queue — buffer candidates until callId is assigned
  const iceCandidateQueueRef = useRef<{ targetUserId: string; candidate: RTCIceCandidateInit }[]>([]);
  // Dynamic ICE servers from backend (fetched on socket connect)
  const iceServersRef = useRef<RTCIceServer[]>(DEFAULT_ICE_SERVERS);
  // Ringback tone ref for outgoing calls
  const ringbackRef = useRef<{ ctx: AudioContext; interval: NodeJS.Timeout } | null>(null);
  callStateRef.current = callState;
  callInfoRef.current = callInfo;
  callDurationRef.current = callDuration;

  // Save call history to localStorage (keep up to 500 entries)
  useEffect(() => {
    const trimmed = callHistory.slice(0, 500);
    localStorage.setItem('call-history', JSON.stringify(trimmed));
    if (callHistory.length > 500) {
      setCallHistory(trimmed);
    }
  }, [callHistory]);

  const addToHistory = useCallback((entry: Omit<CallHistoryEntry, 'id' | 'timestamp'>) => {
    setCallHistory(prev => [{
      ...entry,
      id: `call-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }, ...prev]);
  }, []);

  const clearCallHistory = useCallback(() => {
    setCallHistory([]);
    localStorage.removeItem('call-history');
  }, []);

  // Monitor connection quality — checks both audio AND video packet loss
  const startQualityMonitor = useCallback(() => {
    if (qualityTimerRef.current) clearInterval(qualityTimerRef.current);
    qualityTimerRef.current = setInterval(async () => {
      if (!peerConnectionRef.current) return;
      try {
        const stats = await peerConnectionRef.current.getStats();
        let audioPacketsLost = 0;
        let audioPacketsReceived = 0;
        let videoPacketsLost = 0;
        let videoPacketsReceived = 0;
        let roundTripTime = 0;
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            audioPacketsLost = report.packetsLost || 0;
            audioPacketsReceived = report.packetsReceived || 0;
          }
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            videoPacketsLost = report.packetsLost || 0;
            videoPacketsReceived = report.packetsReceived || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            roundTripTime = report.currentRoundTripTime || 0;
          }
        });
        const totalPacketsLost = audioPacketsLost + videoPacketsLost;
        const totalPacketsReceived = audioPacketsReceived + videoPacketsReceived;
        const totalPackets = totalPacketsLost + totalPacketsReceived;
        const lossRate = totalPackets > 0 ? totalPacketsLost / totalPackets : 0;
        if (lossRate < 0.01 && roundTripTime < 0.15) setConnectionQuality('excellent');
        else if (lossRate < 0.03 && roundTripTime < 0.3) setConnectionQuality('good');
        else if (lossRate < 0.08 && roundTripTime < 0.5) setConnectionQuality('fair');
        else setConnectionQuality('poor');
      } catch {
        setConnectionQuality('unknown');
      }
    }, 3000);
  }, []);

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    // Clean up all group peer connections
    groupPeerConnectionsRef.current.forEach(pc => pc.close());
    groupPeerConnectionsRef.current.clear();
    // Stop recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      recordedChunksRef.current = [];
    }
    // Clean up remote audio element
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }
    // Clear call timeout
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    setRemoteStream(null);
    setCallInfo(null);
    setCallState('idle');
    setIsMuted(false);
    setIsVideoOff(false);
    setIsSpeakerOn(false);
    setCallDuration(0);
    setIsScreenSharing(false);
    setIsRecording(false);
    setConnectionQuality('unknown');
    setGroupParticipants([]);
    setIsMinimized(false);
    reconnectAttemptsRef.current = 0;
    originalVideoTrackRef.current = null;
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (qualityTimerRef.current) {
      clearInterval(qualityTimerRef.current);
      qualityTimerRef.current = null;
    }
    pendingOfferRef.current = null;
    iceCandidateQueueRef.current = [];
    // Stop ringback tone if playing
    stopRingback();
  }, []);

  // Ringback tone for outgoing calls (plays "ring... ring..." pattern like a phone)
  const startRingback = useCallback(() => {
    try {
      stopRingback();
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const playRingback = () => {
        // UK/US ringback: 440Hz + 480Hz for 2s, silence for 4s
        const now = ctx.currentTime;
        for (let i = 0; i < 2; i++) {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc1.frequency.value = 440;
          osc2.frequency.value = 480;
          osc1.type = 'sine';
          osc2.type = 'sine';
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 2);
          osc2.stop(now + 2);
        }
      };
      playRingback();
      const interval = setInterval(playRingback, 4000); // Ring every 4 seconds
      ringbackRef.current = { ctx, interval };
    } catch { /* audio not available */ }
  }, []);

  const stopRingback = useCallback(() => {
    if (ringbackRef.current) {
      clearInterval(ringbackRef.current.interval);
      ringbackRef.current.ctx.close().catch(() => {});
      ringbackRef.current = null;
    }
  }, []);

  // Flush queued ICE candidates once callId is available
  const flushIceCandidateQueue = useCallback((callId: string) => {
    const queue = iceCandidateQueueRef.current;
    if (queue.length > 0) {
      console.log(`[Call] Flushing ${queue.length} queued ICE candidates for callId: ${callId}`);
      queue.forEach(({ targetUserId, candidate }) => {
        socketService.emit('call:ice-candidate', { callId, targetUserId, candidate });
      });
      iceCandidateQueueRef.current = [];
    }
  }, []);

  const attemptReconnect = useCallback(async () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      cleanup();
      return;
    }
    reconnectAttemptsRef.current += 1;
    setCallState('reconnecting');
    // Try to renegotiate the connection
    if (peerConnectionRef.current && callInfo) {
      try {
        const offer = await peerConnectionRef.current.createOffer({ iceRestart: true });
        await peerConnectionRef.current.setLocalDescription(offer);
        socketService.emit('call:renegotiate', {
          callId: callInfo.callId,
          targetUserId: callInfo.peerId,
          offer: peerConnectionRef.current.localDescription,
        });
      } catch {
        cleanup();
      }
    }
  }, [callInfo, cleanup]);

  const createPeerConnection = useCallback((targetUserId: string, callId: string) => {
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    // Store callId in ref so ICE candidates always use the latest callId
    if (callId) callIdRef.current = callId;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const currentCallId = callIdRef.current || callId;
        if (!currentCallId) {
          // Queue ICE candidates until callId is available (prevents sending with empty callId)
          console.log('[Call] Queuing ICE candidate (no callId yet)');
          iceCandidateQueueRef.current.push({ targetUserId, candidate: event.candidate.toJSON() });
          return;
        }
        socketService.emit('call:ice-candidate', {
          callId: currentCallId,
          targetUserId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Remote track received:', event.streams[0]);
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState('connected');
        reconnectAttemptsRef.current = 0;
        startQualityMonitor();
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      } else if (pc.connectionState === 'disconnected') {
        attemptReconnect();
      } else if (pc.connectionState === 'failed') {
        attemptReconnect();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup, startQualityMonitor, attemptReconnect]);

  const getMediaStream = useCallback(async (callType: CallType) => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: isNoiseCancellation ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : true,
        video: callType === 'video' ? { width: 1280, height: 720, frameRate: 30 } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Failed to get media stream:', error);
      throw new Error('Failed to access camera/microphone');
    }
  }, [isNoiseCancellation]);

  const initiateCall = useCallback(async (targetUserId: string, targetUserName: string, callType: CallType, chatId?: string) => {
    console.log('[Call] initiateCall called:', { targetUserId, targetUserName, callType, chatId });
    try {
      setCallState('calling');
      callIdRef.current = ''; // Reset callId ref
      setCallInfo({
        callId: '',
        peerId: targetUserId,
        peerName: targetUserName,
        callType,
        isOutgoing: true,
      });

      let stream: MediaStream;
      try {
        stream = await getMediaStream(callType);
      } catch (mediaError) {
        console.error('[Call] Media permission denied:', mediaError);
        // Keep the call dialog visible briefly to show the error
        setTimeout(() => {
          addToHistory({
            peerId: targetUserId,
            peerName: targetUserName,
            callType,
            direction: 'outgoing',
            status: 'no-answer',
            duration: 0,
          });
          cleanup();
        }, 500);
        // Use non-blocking notification instead of alert()
        const msg = `Cannot access ${callType === 'video' ? 'camera/microphone' : 'microphone'}. Please allow access in your browser settings.`;
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Permission Required', { body: msg });
        }
        console.warn('[Call]', msg);
        return;
      }

      // Set outgoing call timeout (45 seconds)
      callTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === 'calling') {
          console.log('[Call] Outgoing call timed out');
          addToHistory({
            peerId: targetUserId,
            peerName: targetUserName,
            callType,
            direction: 'outgoing',
            status: 'no-answer',
            duration: 0,
          });
          if (callInfoRef.current?.callId) {
            socketService.emit('call:end', {
              callId: callInfoRef.current.callId,
              targetUserId,
            });
          }
          cleanup();
        }
      }, CALL_TIMEOUT_MS);

      const pc = createPeerConnection(targetUserId, '');

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Start ringback tone for outgoing call
      startRingback();

      console.log('[Call] Emitting call:initiate to server');
      socketService.emit('call:initiate', {
        targetUserId,
        callType,
        chatId,
        offer: pc.localDescription,
      }, (response: unknown) => {
        const res = response as { success: boolean; callId?: string; error?: string };
        console.log('[Call] Server response:', res);
        if (res.success && res.callId) {
          // Update both state and ref so ICE candidates use the correct callId
          callIdRef.current = res.callId;
          setCallInfo(prev => prev ? { ...prev, callId: res.callId! } : null);
          // Flush queued ICE candidates now that we have a callId
          flushIceCandidateQueue(res.callId);
        } else {
          console.error('[Call] Server rejected call:', res.error);
          addToHistory({
            peerId: targetUserId,
            peerName: targetUserName,
            callType,
            direction: 'outgoing',
            status: 'no-answer',
            duration: 0,
          });
          cleanup();
        }
      });
    } catch (error) {
      console.error('[Call] Failed to initiate call:', error);
      cleanup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getMediaStream, createPeerConnection, cleanup, addToHistory, startRingback, stopRingback, flushIceCandidateQueue]);

  const initiateGroupCall = useCallback(async (participantIds: string[], participantNames: string[], callType: CallType) => {
    try {
      setCallState('calling');
      setCallInfo({
        callId: '',
        peerId: participantIds[0],
        peerName: participantNames.join(', '),
        callType,
        isOutgoing: true,
        isGroupCall: true,
      });
      setGroupParticipants(participantIds.map((id, i) => ({
        id,
        name: participantNames[i],
        stream: null,
        isMuted: false,
        isVideoOff: callType === 'audio',
        isSpeaking: false,
      })));

      const stream = await getMediaStream(callType);
      // For group calls, create separate peer connections for each participant
      // stored in groupPeerConnectionsRef Map (not the single peerConnectionRef)
      for (const pid of participantIds) {
        const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
        groupPeerConnectionsRef.current.set(pid, pc);

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socketService.emit('call:ice-candidate', {
              callId: callIdRef.current,
              targetUserId: pid,
              candidate: event.candidate.toJSON(),
            });
          }
        };

        pc.ontrack = (event) => {
          setGroupParticipants(prev => prev.map(p =>
            p.id === pid ? { ...p, stream: event.streams[0] } : p
          ));
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            setCallState('connected');
            startQualityMonitor();
            if (!callTimerRef.current) {
              callTimerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
              }, 1000);
            }
          }
        };

        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketService.emit('call:initiate', {
          targetUserId: pid,
          callType,
          offer: pc.localDescription,
          isGroupCall: true,
        });
      }
    } catch (error) {
      console.error('Failed to initiate group call:', error);
      cleanup();
    }
  }, [getMediaStream, cleanup, startQualityMonitor]);

  const answerCall = useCallback(async () => {
    if (!callInfo || !pendingOfferRef.current) return;

    try {
      const stream = await getMediaStream(callInfo.callType);
      const pc = createPeerConnection(callInfo.peerId, callInfo.callId);

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketService.emit('call:answer', {
        callId: callInfo.callId,
        targetUserId: callInfo.peerId,
        answer: pc.localDescription,
      });

      // Don't set 'connected' here — let onconnectionstatechange handle it
      // when the RTCPeerConnection actually reaches 'connected' state
    } catch (error) {
      console.error('Failed to answer call:', error);
      cleanup();
    }
  }, [callInfo, getMediaStream, createPeerConnection, cleanup]);

  const rejectCall = useCallback(() => {
    if (callInfo) {
      socketService.emit('call:reject', {
        callId: callInfo.callId,
        targetUserId: callInfo.peerId,
        reason: 'Call rejected',
      });
      addToHistory({
        peerId: callInfo.peerId,
        peerName: callInfo.peerName,
        callType: callInfo.callType,
        direction: 'incoming',
        status: 'rejected',
        duration: 0,
      });
    }
    cleanup();
  }, [callInfo, cleanup, addToHistory]);

  const endCall = useCallback(() => {
    if (callInfo) {
      socketService.emit('call:end', {
        callId: callInfo.callId,
        targetUserId: callInfo.peerId,
      });
      // Fix H5: Determine correct status based on actual call state
      const wasConnected = callStateRef.current === 'connected';
      addToHistory({
        peerId: callInfo.peerId,
        peerName: callInfo.peerName,
        callType: callInfo.callType,
        direction: callInfo.isOutgoing ? 'outgoing' : 'incoming',
        status: wasConnected ? 'answered' : 'no-answer',
        duration: callDuration,
        isGroupCall: callInfo.isGroupCall,
      });
    }
    cleanup();
  }, [callInfo, callDuration, cleanup, addToHistory]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(prev => !prev);
    }
  }, [localStream]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn(prev => {
      const newVal = !prev;
      // Apply volume to remote audio element (for audio-only calls)
      if (remoteAudioRef.current) {
        remoteAudioRef.current.volume = newVal ? 1.0 : 0.3;
      }
      return newVal;
    });
  }, []);

  const switchCamera = useCallback(async () => {
    if (!localStream || !peerConnectionRef.current) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;
    try {
      const currentFacing = videoTrack.getSettings().facingMode;
      const newFacing = currentFacing === 'user' ? 'environment' : 'user';
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }
      videoTrack.stop();
      localStream.removeTrack(videoTrack);
      localStream.addTrack(newVideoTrack);
      setLocalStream(new MediaStream(localStream.getTracks()));
    } catch (error) {
      console.error('Failed to switch camera:', error);
    }
  }, [localStream]);

  const toggleScreenShare = useCallback(async () => {
    if (!peerConnectionRef.current || !localStream) return;
    
    if (isScreenSharing) {
      // Stop screen sharing, restore camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      if (originalVideoTrackRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(originalVideoTrackRef.current);
        }
        localStream.getVideoTracks().forEach(t => { localStream.removeTrack(t); t.stop(); });
        localStream.addTrack(originalVideoTrackRef.current);
        setLocalStream(new MediaStream(localStream.getTracks()));
        originalVideoTrackRef.current = null;
      }
      setIsScreenSharing(false);
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080, frameRate: 15 },
          audio: false,
        });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Save original video track
        const currentVideoTrack = localStream.getVideoTracks()[0];
        if (currentVideoTrack) {
          originalVideoTrackRef.current = currentVideoTrack;
        }
        
        // Replace in peer connection
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }
        
        // Update local stream
        localStream.getVideoTracks().forEach(t => localStream.removeTrack(t));
        localStream.addTrack(screenTrack);
        setLocalStream(new MediaStream(localStream.getTracks()));
        setIsScreenSharing(true);
        
        // Handle user stopping screen share via browser UI — use stable ref-based approach
        screenTrack.onended = () => {
          // Directly stop screen sharing instead of calling toggleScreenShare (avoids stale closure)
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
          }
          if (originalVideoTrackRef.current && peerConnectionRef.current) {
            const videoSender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(originalVideoTrackRef.current);
            }
            originalVideoTrackRef.current = null;
          }
          setIsScreenSharing(false);
        };
      } catch (error) {
        console.error('Failed to share screen:', error);
      }
    }
  }, [isScreenSharing, localStream]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording using MediaRecorder API
      try {
        const streamsToRecord: MediaStreamTrack[] = [];
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => streamsToRecord.push(t));
        }
        if (remoteStream) {
          remoteStream.getTracks().forEach(t => streamsToRecord.push(t));
        }
        if (streamsToRecord.length === 0) {
          console.warn('[Call] No streams available to record');
          return;
        }
        const combinedStream = new MediaStream(streamsToRecord);
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'audio/webm';
        const recorder = new MediaRecorder(combinedStream, { mimeType });
        recordedChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        recorder.onstop = () => {
          if (recordedChunksRef.current.length > 0) {
            const blob = new Blob(recordedChunksRef.current, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `call-recording-${new Date().toISOString().slice(0, 19)}.webm`;
            a.click();
            URL.revokeObjectURL(url);
          }
          recordedChunksRef.current = [];
          mediaRecorderRef.current = null;
        };
        recorder.start(1000); // collect data every second
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (error) {
        console.error('[Call] Failed to start recording:', error);
      }
    }
  }, [isRecording, remoteStream]);

  const toggleNoiseCancellation = useCallback(() => {
    setIsNoiseCancellation(prev => {
      const newVal = !prev;
      // Apply noise cancellation to existing audio tracks
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.applyConstraints({
            echoCancellation: newVal,
            noiseSuppression: newVal,
            autoGainControl: newVal,
          }).catch((err) => {
            console.warn('[Call] Noise cancellation not supported by this browser:', err);
          });
        });
      }
      return newVal;
    });
  }, [localStream]);

  const addParticipant = useCallback((userId: string, userName: string) => {
    if (!callInfo || !localStream) return;
    setGroupParticipants(prev => [...prev, {
      id: userId,
      name: userName,
      stream: null,
      isMuted: false,
      isVideoOff: callInfo.callType === 'audio',
      isSpeaking: false,
    }]);
    // Signal the server to add participant
    socketService.emit('call:add-participant', {
      callId: callInfo.callId,
      targetUserId: userId,
      callType: callInfo.callType,
    });
  }, [callInfo, localStream]);

  // Socket event listeners — registered ONCE, use refs to avoid stale closures
  // This prevents the critical bug where listeners were re-registered every time
  // callState/callDuration changed, causing call popups to close immediately
  useEffect(() => {
    const handleIncomingCall = (data: {
      callId: string;
      callerId: string;
      callerName: string;
      callType: CallType;
      offer: RTCSessionDescriptionInit;
      isGroupCall?: boolean;
    }) => {
      console.log('Incoming call:', data);
      // Use ref to get current callState (not stale closure value)
      if (callStateRef.current !== 'idle') {
        socketService.emit('call:reject', {
          callId: data.callId,
          targetUserId: data.callerId,
          reason: 'User is busy',
        });
        addToHistory({
          peerId: data.callerId,
          peerName: data.callerName,
          callType: data.callType,
          direction: 'incoming',
          status: 'missed',
          duration: 0,
          isGroupCall: data.isGroupCall,
        });
        return;
      }

      pendingOfferRef.current = data.offer;
      callIdRef.current = data.callId;
      setCallInfo({
        callId: data.callId,
        peerId: data.callerId,
        peerName: data.callerName,
        callType: data.callType,
        isOutgoing: false,
        isGroupCall: data.isGroupCall,
      });
      setCallState('incoming');

      // Play ringtone sound for incoming call
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const playTone = (freq: number, startTime: number, duration: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.15, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          osc.start(startTime);
          osc.stop(startTime + duration);
        };
        // Ring pattern: two tones repeated (longer ring for incoming)
        for (let i = 0; i < 5; i++) {
          playTone(440, audioCtx.currentTime + i * 0.6, 0.25);
          playTone(520, audioCtx.currentTime + i * 0.6 + 0.25, 0.25);
        }
        setTimeout(() => audioCtx.close(), 5000);
      } catch { /* audio not available */ }

      // Browser notification for incoming call
      if ('Notification' in window && Notification.permission === 'granted') {
        const callNotification = new Notification(`Incoming ${data.callType} call`, {
          body: `${data.callerName} is calling you`,
          icon: '/favicon.ico',
          tag: `call-${data.callId}`,
          requireInteraction: true,
        });
        callNotification.onclick = () => {
          window.focus();
          callNotification.close();
        };
        // Auto-close after 30 seconds
        setTimeout(() => callNotification.close(), 30000);
      }
    };

    const handleCallAnswered = async (data: { callId: string; answer: RTCSessionDescriptionInit }) => {
      console.log('Call answered:', data);
      // Stop ringback tone — callee has answered
      stopRingback();
      // Clear the call timeout since the callee answered
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        // Don't set 'connected' here — let onconnectionstatechange handle it
        // when the RTCPeerConnection actually reaches 'connected' state
      }
    };

    const handleCallRejected = (data: { callId: string; reason: string }) => {
      console.log('Call rejected:', data);
      // Stop ringback tone — callee rejected
      stopRingback();
      // Use ref to get current callInfo (not stale closure value)
      const info = callInfoRef.current;
      if (info) {
        addToHistory({
          peerId: info.peerId,
          peerName: info.peerName,
          callType: info.callType,
          direction: 'outgoing',
          status: 'rejected',
          duration: 0,
        });
      }
      cleanup();
    };

    const handleCallEnded = (data: { callId: string }) => {
      console.log('Call ended:', data);
      // Use refs to get current values (not stale closure values)
      const info = callInfoRef.current;
      if (info) {
        const wasConnected = callStateRef.current === 'connected';
        addToHistory({
          peerId: info.peerId,
          peerName: info.peerName,
          callType: info.callType,
          direction: info.isOutgoing ? 'outgoing' : 'incoming',
          status: wasConnected ? 'answered' : 'no-answer',
          duration: callDurationRef.current,
        });
      }
      cleanup();
    };

    const handleIceCandidate = async (data: { callId: string; candidate: RTCIceCandidateInit }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('Failed to add ICE candidate:', error);
        }
      }
    };

    // Handle call renegotiation (ICE restart from remote peer)
    const handleCallRenegotiate = async (data: { callId: string; fromUserId: string; offer: RTCSessionDescriptionInit }) => {
      console.log('[Call] Renegotiation offer received:', data.callId);
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          socketService.emit('call:answer', {
            callId: data.callId,
            targetUserId: data.fromUserId,
            answer: peerConnectionRef.current.localDescription,
          });
          console.log('[Call] Renegotiation answer sent');
        } catch (error) {
          console.error('[Call] Renegotiation failed:', error);
        }
      }
    };

    // Fetch dynamic ICE servers from backend on connect
    socketService.emit('call:get-ice-servers', {}, (response: unknown) => {
      const res = response as { success?: boolean; iceServers?: RTCIceServer[] };
      if (res?.success && res.iceServers && res.iceServers.length > 0) {
        console.log('[Call] Received ICE servers from backend:', res.iceServers.length);
        iceServersRef.current = res.iceServers;
      } else {
        console.log('[Call] Using default ICE servers');
      }
    });

    const unsubIncoming = socketService.on('call:incoming', handleIncomingCall as (data: unknown) => void);
    const unsubAnswered = socketService.on('call:answered', handleCallAnswered as (data: unknown) => void);
    const unsubRejected = socketService.on('call:rejected', handleCallRejected as (data: unknown) => void);
    const unsubEnded = socketService.on('call:ended', handleCallEnded as (data: unknown) => void);
    const unsubIceCandidate = socketService.on('call:ice-candidate', handleIceCandidate as (data: unknown) => void);
    const unsubRenegotiate = socketService.on('call:renegotiate', handleCallRenegotiate as (data: unknown) => void);

    return () => {
      unsubIncoming();
      unsubAnswered();
      unsubRejected();
      unsubEnded();
      unsubIceCandidate();
      unsubRenegotiate();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup, addToHistory]);

  return (
    <CallContext.Provider
      value={{
        callState,
        callInfo,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        isSpeakerOn,
        callDuration,
        isScreenSharing,
        isRecording,
        isNoiseCancellation,
        connectionQuality,
        callHistory,
        groupParticipants,
        isMinimized,
        initiateCall,
        initiateGroupCall,
        answerCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleSpeaker,
        switchCamera,
        toggleScreenShare,
        toggleRecording,
        toggleNoiseCancellation,
        setIsMinimized,
        addParticipant,
        clearCallHistory,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}
