'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';
import socketService from '@/lib/socket';

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
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(call.type === 'AUDIO');
  const [duration, setDuration] = useState(0);
  const [speakerOn, setSpeakerOn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Auto-timeout after 45 seconds if not connected
    timeoutRef.current = setTimeout(() => {
      if (callState === 'ringing') {
        setCallState('ended');
        setTimeout(onEnd, 2000);
      }
    }, 45000);

    const handleCallAnswered = () => {
      setCallState('connected');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    };

    const handleCallEnded = () => {
      setCallState('ended');
      setTimeout(onEnd, 1500);
    };

    socketService.on('call:answered', handleCallAnswered);
    socketService.on('call:ended', handleCallEnded);
    socketService.on('call:rejected', handleCallEnded);

    return () => {
      socketService.off('call:answered', handleCallAnswered);
      socketService.off('call:ended', handleCallEnded);
      socketService.off('call:rejected', handleCallEnded);
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [callState, onEnd]);

  // Initiate call if outgoing
  useEffect(() => {
    if (call.isOutgoing && call.targetUserId) {
      socketService.emit('call:initiate', {
        targetUserId: call.targetUserId,
        chatId: call.chatId,
        type: call.type,
      });
    }
  }, [call]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setCallState('ended');
    onEnd();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-gray-800 z-50 flex flex-col items-center justify-between py-16">
      {/* Top section */}
      <div className="text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-xl">
          {call.targetUserId?.[0]?.toUpperCase() || '?'}
        </div>
        <h2 className="text-2xl font-semibold text-white mb-1">
          {call.type === 'VIDEO' ? 'Video Call' : 'Voice Call'}
        </h2>
        <p className="text-gray-400">
          {callState === 'ringing' && (call.isOutgoing ? 'Ringing...' : 'Incoming call')}
          {callState === 'connected' && formatDuration(duration)}
          {callState === 'ended' && 'Call ended'}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        {/* Mute */}
        <button
          onClick={() => setMuted(!muted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            muted ? 'bg-white text-gray-800' : 'bg-white/10 text-white'
          }`}
        >
          {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Speaker */}
        <button
          onClick={() => setSpeakerOn(!speakerOn)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            speakerOn ? 'bg-white text-gray-800' : 'bg-white/10 text-white'
          }`}
        >
          <Volume2 className="w-6 h-6" />
        </button>

        {/* Video toggle (only for video calls) */}
        {call.type === 'VIDEO' && (
          <button
            onClick={() => setVideoOff(!videoOff)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              videoOff ? 'bg-white text-gray-800' : 'bg-white/10 text-white'
            }`}
          >
            {videoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}

        {/* End call */}
        <button
          onClick={handleEndCall}
          className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-colors"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>

      {/* E2E encryption badge */}
      <div className="flex items-center gap-1 text-gray-500 text-xs">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        <span>End-to-end encrypted</span>
      </div>
    </div>
  );
}
