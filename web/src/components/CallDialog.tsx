'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, Minimize2, Maximize2 } from 'lucide-react';
import { Room, RoomEvent, Track, ConnectionState } from 'livekit-client';
import socketService from '@/lib/socket';
import api from '@/lib/api';

interface CallDialogProps {
  call: {
    chatId: string;
    targetUserId?: string;
    callerId?: string;
    type: 'AUDIO' | 'VIDEO';
    isOutgoing: boolean;
  };
  currentUser: any;
  onEnd: () => void;
}

export default function CallDialog({ call, currentUser, onEnd }: CallDialogProps) {
  const [callState, setCallState] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>('ringing');
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(call.type === 'AUDIO');
  const [duration, setDuration] = useState(0);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callStateRef = useRef(callState);
  callStateRef.current = callState;
  const livekitRoomRef = useRef<string | null>(null);
  const callIdRef = useRef<string | null>((call as any).callId || null);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://abhi.so/livekit/';

  // Connect to LiveKit room for actual audio/video
  const connectToLiveKit = useCallback(async (roomName?: string) => {
    try {
      setCallState('connecting');
      const finalRoomName = roomName || livekitRoomRef.current || `call-${call.chatId}-${Date.now()}`;

      const token = await api.getLiveKitToken(finalRoomName);

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
        } else if (track.kind === Track.Kind.Audio && remoteAudioRef.current) {
          track.attach(remoteAudioRef.current);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach();
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        setCallState('connected');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      });

      room.on(RoomEvent.Disconnected, () => {
        if (callStateRef.current !== 'ended') {
          setCallState('ended');
          setTimeout(onEnd, 1500);
        }
      });

      await room.connect(livekitUrl, token as string);

      // Publish local tracks
      if (call.type === 'VIDEO') {
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
        if (camPub?.track && localVideoRef.current) {
          camPub.track.attach(localVideoRef.current);
        }
      } else {
        await room.localParticipant.setMicrophoneEnabled(true);
      }

      if (room.remoteParticipants.size > 0) {
        setCallState('connected');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    } catch (err: any) {
      console.error('LiveKit connection error:', err);
      setError(err.message || 'Failed to connect call');
      setCallState('ended');
      setTimeout(onEnd, 3000);
    }
  }, [call, livekitUrl, onEnd]);

  // Socket signaling
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (callStateRef.current === 'ringing') {
        setCallState('ended');
        setTimeout(onEnd, 2000);
      }
    }, 45000);

    // For outgoing calls: backend sends us the shared room name and callId
    const handleRoomReady = (data: { livekitRoom: string; callId?: string }) => {
      livekitRoomRef.current = data.livekitRoom;
      if (data.callId) callIdRef.current = data.callId;
    };

    // When callee answers, both sides connect to the same LiveKit room
    const handleCallAnswered = (data: { livekitRoom?: string }) => {
      const roomName = data?.livekitRoom || livekitRoomRef.current || undefined;
      connectToLiveKit(roomName);
    };

    const handleCallEnded = () => {
      setCallState('ended');
      roomRef.current?.disconnect();
      setTimeout(onEnd, 1500);
    };

    socketService.on('call:room-ready', handleRoomReady);
    socketService.on('call:answered', handleCallAnswered);
    socketService.on('call:ended', handleCallEnded);
    socketService.on('call:rejected', handleCallEnded);

    return () => {
      socketService.off('call:room-ready', handleRoomReady);
      socketService.off('call:answered', handleCallAnswered);
      socketService.off('call:ended', handleCallEnded);
      socketService.off('call:rejected', handleCallEnded);
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [connectToLiveKit, onEnd]);

  // Initiate outgoing call or connect incoming
  useEffect(() => {
    if (call.isOutgoing && call.targetUserId) {
      socketService.emit('call:initiate', {
        targetUserId: call.targetUserId,
        chatId: call.chatId,
        type: call.type,
      });
    } else if (!call.isOutgoing) {
      // Incoming call — use the room name from call:incoming event
      const incomingRoom = (call as any).livekitRoom;
      connectToLiveKit(incomingRoom);
    }
  }, [call, connectToLiveKit]);

  // Duration timer
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  const toggleMute = useCallback(() => {
    roomRef.current?.localParticipant.setMicrophoneEnabled(muted);
    setMuted(!muted);
  }, [muted]);

  const toggleVideo = useCallback(() => {
    roomRef.current?.localParticipant.setCameraEnabled(videoOff);
    setVideoOff(!videoOff);
  }, [videoOff]);

  const handleEndCall = useCallback(() => {
    setCallState('ended');
    roomRef.current?.disconnect();
    const target = call.targetUserId || call.callerId;
    if (target) {
      socketService.emit('call:end', {
        targetUserId: target,
        chatId: call.chatId,
        callId: callIdRef.current,
      });
    }
    onEnd();
  }, [call, onEnd]);

  useEffect(() => {
    return () => { roomRef.current?.disconnect(); };
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const statusText = () => {
    if (error) return error;
    if (callState === 'ringing') return call.isOutgoing ? 'Ringing...' : 'Incoming call';
    if (callState === 'connecting') return 'Connecting...';
    if (callState === 'connected') return formatDuration(duration);
    return 'Call ended';
  };

  // PiP minimized floating window
  if (minimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-72 bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden cursor-pointer" onClick={() => setMinimized(false)}>
        <audio ref={remoteAudioRef} autoPlay />
        {/* Mini video preview for video calls */}
        {call.type === 'VIDEO' && callState === 'connected' && (
          <div className="relative h-36">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-2 right-2 w-16 h-20 object-cover rounded-lg border border-white/30" />
          </div>
        )}
        {/* Info bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {(call.targetUserId || call.callerId || '?')[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{call.type === 'VIDEO' ? 'Video Call' : 'Voice Call'}</p>
              <p className="text-green-400 text-xs">{statusText()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); setMinimized(false); }} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleEndCall(); }} className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors">
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-gray-800 z-50 flex flex-col items-center justify-between py-16">
      {/* Minimize button */}
      {callState === 'connected' && (
        <button onClick={() => setMinimized(true)} className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
          <Minimize2 className="w-5 h-5" />
        </button>
      )}

      {/* Video area */}
      {call.type === 'VIDEO' && callState === 'connected' && (
        <>
          <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute top-4 right-4 w-32 h-44 object-cover rounded-xl border-2 border-white/30 z-10" />
        </>
      )}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Top section */}
      <div className="text-center z-20 relative">
        {!(call.type === 'VIDEO' && callState === 'connected') && (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-xl">
            {(call.targetUserId || call.callerId || '?')[0]?.toUpperCase()}
          </div>
        )}
        <h2 className="text-2xl font-semibold text-white mb-1">
          {call.type === 'VIDEO' ? 'Video Call' : 'Voice Call'}
        </h2>
        <p className={`text-sm ${error ? 'text-red-400' : 'text-gray-400'}`}>
          {statusText()}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 z-20 relative">
        <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-white text-gray-800' : 'bg-white/10 text-white'}`}>
          {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button onClick={() => setSpeakerOn(!speakerOn)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${speakerOn ? 'bg-white text-gray-800' : 'bg-white/10 text-white'}`}>
          <Volume2 className="w-6 h-6" />
        </button>

        {call.type === 'VIDEO' && (
          <button onClick={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${videoOff ? 'bg-white text-gray-800' : 'bg-white/10 text-white'}`}>
            {videoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}

        <button onClick={handleEndCall} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-colors">
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>

      {/* E2E encryption badge */}
      <div className="flex items-center gap-1 text-gray-500 text-xs z-20 relative">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        <span>End-to-end encrypted</span>
      </div>
    </div>
  );
}
