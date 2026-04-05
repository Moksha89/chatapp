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
  isSpeakerOn: boolean;
  callDuration: number;
  initiateCall: (targetUserId: string, targetUserName: string, callType: CallType) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

// Bug #20 fix: Use environment variables for TURN server credentials instead of hardcoding
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
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  // Bug #17 fix: Use ref for localStream to avoid stale closure
  const localStreamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    // Use ref to always get current localStream value (avoids stale closure)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
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
    setIsSpeakerOn(false);
    setCallDuration(0);
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    pendingOfferRef.current = null;
  }, []);

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
        // Start call duration timer
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
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
      localStreamRef.current = stream;
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

  const toggleSpeaker = useCallback(() => {
    // Toggle speaker by adjusting audio output (Web Audio API)
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
        isSpeakerOn,
        callDuration,
        initiateCall,
        answerCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleSpeaker,
        switchCamera,
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
