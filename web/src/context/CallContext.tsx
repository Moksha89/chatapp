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
  initiateCall: (targetUserId: string, targetUserName: string, callType: CallType) => Promise<void>;
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

const TURN_URL = import.meta.env.VITE_TURN_URL || 'turn:openrelay.metered.ca';
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME || 'openrelayproject';
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL || 'openrelayproject';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  {
    urls: `${TURN_URL}:80`,
    username: TURN_USERNAME,
    credential: TURN_CREDENTIAL,
  },
  {
    urls: `${TURN_URL}:443`,
    username: TURN_USERNAME,
    credential: TURN_CREDENTIAL,
  },
  {
    urls: `${TURN_URL}:443?transport=tcp`,
    username: TURN_USERNAME,
    credential: TURN_CREDENTIAL,
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
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  // Save call history to localStorage
  useEffect(() => {
    localStorage.setItem('call-history', JSON.stringify(callHistory.slice(0, 100)));
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

  // Monitor connection quality
  const startQualityMonitor = useCallback(() => {
    if (qualityTimerRef.current) clearInterval(qualityTimerRef.current);
    qualityTimerRef.current = setInterval(async () => {
      if (!peerConnectionRef.current) return;
      try {
        const stats = await peerConnectionRef.current.getStats();
        let packetsLost = 0;
        let packetsReceived = 0;
        let roundTripTime = 0;
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            packetsLost = report.packetsLost || 0;
            packetsReceived = report.packetsReceived || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            roundTripTime = report.currentRoundTripTime || 0;
          }
        });
        const totalPackets = packetsLost + packetsReceived;
        const lossRate = totalPackets > 0 ? packetsLost / totalPackets : 0;
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
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('call:ice-candidate', {
          callId,
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

  const initiateCall = useCallback(async (targetUserId: string, targetUserName: string, callType: CallType) => {
    try {
      setCallState('calling');
      setCallInfo({
        callId: '',
        peerId: targetUserId,
        peerName: targetUserName,
        callType,
        isOutgoing: true,
      });

      const stream = await getMediaStream(callType);
      const pc = createPeerConnection(targetUserId, '');

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketService.emit('call:initiate', {
        targetUserId,
        callType,
        offer: pc.localDescription,
      }, (response: unknown) => {
        const res = response as { success: boolean; callId?: string; error?: string };
        if (res.success && res.callId) {
          setCallInfo(prev => prev ? { ...prev, callId: res.callId! } : null);
        } else {
          console.error('Failed to initiate call:', res.error);
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
      console.error('Failed to initiate call:', error);
      cleanup();
    }
  }, [getMediaStream, createPeerConnection, cleanup, addToHistory]);

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
      // For group calls, initiate connections to each participant
      participantIds.forEach(pid => {
        const pc = createPeerConnection(pid, '');
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
        pc.createOffer().then(offer => {
          pc.setLocalDescription(offer);
          socketService.emit('call:initiate', {
            targetUserId: pid,
            callType,
            offer: pc.localDescription,
            isGroupCall: true,
          });
        });
      });
    } catch (error) {
      console.error('Failed to initiate group call:', error);
      cleanup();
    }
  }, [getMediaStream, createPeerConnection, cleanup]);

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

      setCallState('connected');
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
      addToHistory({
        peerId: callInfo.peerId,
        peerName: callInfo.peerName,
        callType: callInfo.callType,
        direction: callInfo.isOutgoing ? 'outgoing' : 'incoming',
        status: 'answered',
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
    if (remoteStream) {
      const audioTracks = remoteStream.getAudioTracks();
      if (audioTracks.length > 0) {
        setIsSpeakerOn(prev => !prev);
      }
    }
  }, [remoteStream]);

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
        
        // Handle user stopping screen share via browser UI
        screenTrack.onended = () => {
          toggleScreenShare();
        };
      } catch (error) {
        console.error('Failed to share screen:', error);
      }
    }
  }, [isScreenSharing, localStream]);

  const toggleRecording = useCallback(() => {
    setIsRecording(prev => !prev);
    // Recording is handled via UI indicator; actual recording would need server-side support
  }, []);

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
          }).catch(() => {});
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

  // Socket event listeners
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
      if (callState !== 'idle') {
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
      setCallInfo({
        callId: data.callId,
        peerId: data.callerId,
        peerName: data.callerName,
        callType: data.callType,
        isOutgoing: false,
        isGroupCall: data.isGroupCall,
      });
      setCallState('incoming');
    };

    const handleCallAnswered = async (data: { callId: string; answer: RTCSessionDescriptionInit }) => {
      console.log('Call answered:', data);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallState('connected');
      }
    };

    const handleCallRejected = (data: { callId: string; reason: string }) => {
      console.log('Call rejected:', data);
      if (callInfo) {
        addToHistory({
          peerId: callInfo.peerId,
          peerName: callInfo.peerName,
          callType: callInfo.callType,
          direction: 'outgoing',
          status: 'rejected',
          duration: 0,
        });
      }
      cleanup();
    };

    const handleCallEnded = (data: { callId: string }) => {
      console.log('Call ended:', data);
      if (callInfo) {
        addToHistory({
          peerId: callInfo.peerId,
          peerName: callInfo.peerName,
          callType: callInfo.callType,
          direction: callInfo.isOutgoing ? 'outgoing' : 'incoming',
          status: 'answered',
          duration: callDuration,
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

    const unsubIncoming = socketService.on('call:incoming', handleIncomingCall as (data: unknown) => void);
    const unsubAnswered = socketService.on('call:answered', handleCallAnswered as (data: unknown) => void);
    const unsubRejected = socketService.on('call:rejected', handleCallRejected as (data: unknown) => void);
    const unsubEnded = socketService.on('call:ended', handleCallEnded as (data: unknown) => void);
    const unsubIceCandidate = socketService.on('call:ice-candidate', handleIceCandidate as (data: unknown) => void);

    return () => {
      unsubIncoming();
      unsubAnswered();
      unsubRejected();
      unsubEnded();
      unsubIceCandidate();
    };
  }, [callState, callInfo, callDuration, cleanup, addToHistory]);

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
