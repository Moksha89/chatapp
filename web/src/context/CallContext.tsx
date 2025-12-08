import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { socketService } from '../services/socket';

export type CallState = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';
export type CallType = 'audio' | 'video';

interface CallInfo {
  callId: string;
  peerId: string;
  peerName: string;
  callType: CallType;
  isOutgoing: boolean;
}

interface CallContextType {
  callState: CallState;
  callInfo: CallInfo | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  initiateCall: (targetUserId: string, targetUserName: string, callType: CallType) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

// ICE servers configuration with STUN and TURN for reliable connectivity
// TURN servers help when users are behind strict NAT/firewalls
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // Free TURN servers from Open Relay Project (for production, consider self-hosted or paid TURN)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  const cleanup = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
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
    pendingOfferRef.current = null;
  }, [localStream]);

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
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanup();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [cleanup]);

  const getMediaStream = useCallback(async (callType: CallType) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Failed to get media stream:', error);
      throw new Error('Failed to access camera/microphone');
    }
  }, []);

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
          cleanup();
        }
      });
    } catch (error) {
      console.error('Failed to initiate call:', error);
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
    }
    cleanup();
  }, [callInfo, cleanup]);

  const endCall = useCallback(() => {
    if (callInfo) {
      socketService.emit('call:end', {
        callId: callInfo.callId,
        targetUserId: callInfo.peerId,
      });
    }
    cleanup();
  }, [callInfo, cleanup]);

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

  // Socket event listeners
  useEffect(() => {
    const handleIncomingCall = (data: {
      callId: string;
      callerId: string;
      callerName: string;
      callType: CallType;
      offer: RTCSessionDescriptionInit;
    }) => {
      console.log('Incoming call:', data);
      if (callState !== 'idle') {
        socketService.emit('call:reject', {
          callId: data.callId,
          targetUserId: data.callerId,
          reason: 'User is busy',
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
      cleanup();
    };

    const handleCallEnded = (data: { callId: string }) => {
      console.log('Call ended:', data);
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
  }, [callState, cleanup]);

  return (
    <CallContext.Provider
      value={{
        callState,
        callInfo,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        initiateCall,
        answerCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
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
