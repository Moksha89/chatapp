import { useEffect, useRef, useState } from 'react';
import { useCall } from '../context/CallContext';
import type { ConnectionQuality } from '../context/CallContext';
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X, Volume2, VolumeX,
  SwitchCamera, Monitor, MonitorOff, Circle, Shield, Minimize2, Maximize2,
  Users, Wifi, WifiOff, AudioLines, Pause, Play, UserPlus, MessageSquare,
  PhoneIncoming,
} from 'lucide-react';
import { Button } from './ui/button';

function QualityIndicator({ quality }: { quality: ConnectionQuality }) {
  const config = {
    excellent: { bars: 4, color: 'bg-green-400', label: 'Excellent' },
    good: { bars: 3, color: 'bg-green-400', label: 'Good' },
    fair: { bars: 2, color: 'bg-yellow-400', label: 'Fair' },
    poor: { bars: 1, color: 'bg-red-400', label: 'Poor' },
    unknown: { bars: 0, color: 'bg-gray-400', label: '' },
  }[quality];
  if (quality === 'unknown') return null;
  return (
    <div className="flex items-center gap-1.5" title={`Connection: ${config.label}`}>
      <div className="flex items-end gap-0.5 h-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`w-1 rounded-full transition-colors ${i <= config.bars ? config.color : 'bg-gray-600'}`} style={{ height: `${i * 25}%` }} />
        ))}
      </div>
      <span className="text-[10px] text-gray-400">{config.label}</span>
    </div>
  );
}

export function CallDialog() {
  const {
    callState,
    callInfo,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    isOnHold,
    callDuration,
    isScreenSharing,
    isRecording,
    isNoiseCancellation,
    connectionQuality,
    groupParticipants,
    isMinimized,
    securityCode,
    waitingCall,
    answerCall,
    rejectCall,
    rejectWithMessage,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    toggleHold,
    switchCamera,
    toggleScreenShare,
    toggleRecording,
    toggleNoiseCancellation,
    setIsMinimized,
    addParticipant,
    acceptWaitingCall,
    rejectWaitingCall,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [showSecurityCode, setShowSecurityCode] = useState(false);
  const [showQuickReply, setShowQuickReply] = useState(false);
  const ringtoneRef = useRef<{ ctx: AudioContext; interval: ReturnType<typeof setInterval> } | null>(null);

  const QUICK_REPLIES = [
    "Can't talk now. What's up?",
    "I'll call you back.",
    "I'll call you later.",
    "Can't talk now. Call me later?",
  ];

  // Ringtone audio for incoming calls (Web)
  useEffect(() => {
    if (callState === 'incoming') {
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const playRing = () => {
          const now = ctx.currentTime;
          // Classic phone ring: 440Hz + 480Hz, 1s on, 2s off
          for (const freq of [440, 480]) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
            osc.start(now);
            osc.stop(now + 1);
          }
        };
        playRing();
        const interval = setInterval(playRing, 3000);
        ringtoneRef.current = { ctx, interval };
      } catch { /* audio not available */ }
    }
    return () => {
      if (ringtoneRef.current) {
        clearInterval(ringtoneRef.current.interval);
        ringtoneRef.current.ctx.close().catch(() => {});
        ringtoneRef.current = null;
      }
    };
  }, [callState]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Create a hidden audio element for audio-only calls to handle speaker toggle
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Apply volume to both video and audio elements
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = isSpeakerOn ? 1.0 : 0.3;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = isSpeakerOn ? 1.0 : 0.3;
    }
  }, [isSpeakerOn]);

  // For audio-only calls, create a hidden audio element to play remote stream
  useEffect(() => {
    if (remoteStream && callInfo?.callType === 'audio') {
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.volume = isSpeakerOn ? 1.0 : 0.3;
      // Explicitly play to handle browsers that block autoplay
      remoteAudioRef.current.play().catch(err => {
        console.warn('[CallDialog] Audio autoplay blocked, will retry on user gesture:', err);
      });
    }
    return () => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }
    };
  }, [remoteStream, callInfo?.callType, isSpeakerOn]);

  // Auto-hide controls after 10s during video call (matches WhatsApp behavior)
  useEffect(() => {
    if (callState === 'connected' && callInfo?.callType === 'video' && showControls) {
      const timer = setTimeout(() => setShowControls(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [callState, callInfo?.callType, showControls]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callState === 'idle' || !callInfo) {
    return null;
  }

  const isVideoCall = callInfo.callType === 'video';
  const isGroupCall = callInfo.isGroupCall && groupParticipants.length > 0;

  // Minimized floating window
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-20 right-4 z-[100] w-48 h-28 bg-gray-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden cursor-pointer group"
        onClick={() => setIsMinimized(false)}
      >
        {isVideoCall && remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-900/50 to-gray-900 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <span className="text-xl text-white font-semibold">{callInfo.peerName.charAt(0).toUpperCase()}</span>
            </div>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <div className="flex items-center justify-between">
            <span className="text-white text-xs font-medium truncate">{callInfo.peerName}</span>
            <span className="text-green-400 text-[10px] font-mono">{formatDuration(callDuration)}</span>
          </div>
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Maximize2 className="w-5 h-5 text-white" />
        </div>
        {/* End call button on minimized */}
        <button
          onClick={e => { e.stopPropagation(); endCall(); }}
          className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <PhoneOff className="w-3 h-3 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
      <div className="w-full h-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <span className="text-lg font-semibold">
                {callInfo.peerName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{callInfo.peerName}</p>
                {isGroupCall && (
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <Users className="w-3 h-3" /> {groupParticipants.length + 1}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-400">
                  {callState === 'calling' && 'Calling...'}
                  {callState === 'incoming' && 'Incoming call'}
                  {callState === 'connected' && formatDuration(callDuration)}
                  {callState === 'reconnecting' && 'Reconnecting...'}
                </p>
                {callState === 'connected' && <QualityIndicator quality={connectionQuality} />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Status indicators */}
            {isRecording && (
              <span className="flex items-center gap-1 bg-red-500/20 text-red-400 text-[10px] px-2 py-1 rounded-full">
                <Circle className="w-2 h-2 fill-red-400" /> REC
              </span>
            )}
            {isScreenSharing && (
              <span className="flex items-center gap-1 bg-blue-500/20 text-blue-400 text-[10px] px-2 py-1 rounded-full">
                <Monitor className="w-3 h-3" /> Screen
              </span>
            )}
            {isNoiseCancellation && (
              <span className="flex items-center gap-1 bg-green-500/20 text-green-400 text-[10px] px-2 py-1 rounded-full">
                <AudioLines className="w-3 h-3" /> NC
              </span>
            )}
            {callState === 'connected' && (
              <button
                onClick={() => setShowSecurityCode(!showSecurityCode)}
                className="flex items-center gap-1 bg-green-500/20 text-green-400 text-[10px] px-2 py-1 rounded-full hover:bg-green-500/30 transition-colors cursor-pointer"
                title={securityCode ? `Security code: ${securityCode} — Tap to ${showSecurityCode ? 'hide' : 'verify'}` : 'WebRTC SRTP encrypted'}
              >
                <Shield className="w-3 h-3" /> {showSecurityCode && securityCode ? securityCode : 'Encrypted'}
              </button>
            )}
            {callState !== 'incoming' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(true)}
                  className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"
                  title="Minimize"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={endCall}
                  className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"
                >
                  <X className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main content area */}
        <div 
          className="flex-1 relative overflow-hidden rounded-2xl mx-4"
          onClick={() => isVideoCall && setShowControls(!showControls)}
        >
          {/* Reconnecting overlay */}
          {callState === 'reconnecting' && (
            <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
              <div className="text-center">
                <WifiOff className="w-10 h-10 text-yellow-400 mx-auto mb-3 animate-pulse" />
                <p className="text-white font-medium">Reconnecting...</p>
                <p className="text-gray-400 text-sm mt-1">Please wait</p>
              </div>
            </div>
          )}

          {/* Group call grid */}
          {isGroupCall && isVideoCall ? (
            <div className={`w-full h-full grid gap-2 p-2 ${
              groupParticipants.length <= 1 ? 'grid-cols-1' :
              groupParticipants.length <= 4 ? 'grid-cols-2' :
              'grid-cols-3'
            }`}>
              {/* Remote participants */}
              {groupParticipants.map(p => (
                <div key={p.id} className="relative bg-gray-800 rounded-xl overflow-hidden">
                  {p.stream ? (
                    <video autoPlay playsInline className="w-full h-full object-cover" ref={el => { if (el) el.srcObject = p.stream; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#246BFD] to-blue-600 flex items-center justify-center">
                        <span className="text-2xl text-white font-semibold">{p.name.charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <span className="text-white text-xs bg-black/50 px-2 py-0.5 rounded-full">{p.name}</span>
                    <div className="flex items-center gap-1">
                      {p.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                      {p.isSpeaking && <Wifi className="w-3 h-3 text-green-400 animate-pulse" />}
                    </div>
                  </div>
                </div>
              ))}
              {/* Self */}
              <div className="relative bg-gray-800 rounded-xl overflow-hidden">
                {localStream ? (
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-500">You</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2">
                  <span className="text-white text-xs bg-black/50 px-2 py-0.5 rounded-full">You</span>
                </div>
              </div>
            </div>
          ) : isVideoCall ? (
            <>
              {/* 1:1 Video call */}
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover bg-gray-800"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-6 animate-pulse">
                      <span className="text-5xl text-white font-semibold">
                        {callInfo.peerName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-white text-2xl font-medium">{callInfo.peerName}</p>
                    <p className="text-gray-400 mt-2 text-lg">
                      {callState === 'calling' && 'Ringing...'}
                      {callState === 'incoming' && 'Incoming video call'}
                      {callState === 'connected' && 'Connecting video...'}
                    </p>
                  </div>
                </div>
              )}

              {/* Local video PiP */}
              {localStream && (
                <div className="absolute bottom-4 right-4 w-32 h-44 md:w-44 md:h-32 rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl bg-gray-900 cursor-move">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {isVideoOff && (
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                      <VideoOff className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                  {isScreenSharing && (
                    <div className="absolute top-1 left-1 bg-blue-500/80 text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <Monitor className="w-2.5 h-2.5" /> Sharing
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Audio call UI */
            <div className="w-full h-full bg-gradient-to-br from-green-900/50 to-gray-900 flex items-center justify-center">
              <div className="text-center">
                <div className={`w-40 h-40 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-8 shadow-2xl ${callState === 'calling' ? 'animate-pulse' : ''}`}>
                  <span className="text-6xl text-white font-semibold">
                    {callInfo.peerName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-white text-3xl font-medium mb-2">{callInfo.peerName}</p>
                <p className="text-gray-400 text-xl">
                  {callState === 'calling' && 'Ringing...'}
                  {callState === 'incoming' && 'Incoming voice call'}
                  {callState === 'connected' && formatDuration(callDuration)}
                  {callState === 'reconnecting' && 'Reconnecting...'}
                  {callState === 'held' && `On Hold — ${formatDuration(callDuration)}`}
                </p>
                {callState === 'connected' && (
                  <div className="mt-4">
                    <QualityIndicator quality={connectionQuality} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Call controls */}
        <div className={`p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* Incoming call controls */}
          {callState === 'incoming' && (
            <div className="space-y-3">
              {/* Quick reply options */}
              {showQuickReply && (
                <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                  {QUICK_REPLIES.map((msg) => (
                    <button
                      key={msg}
                      onClick={() => { rejectWithMessage(msg); setShowQuickReply(false); }}
                      className="px-3 py-1.5 rounded-full bg-white/10 text-white text-xs hover:bg-white/20 transition-colors"
                    >
                      {msg}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <Button
                    onClick={rejectCall}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-transform hover:scale-105"
                  >
                    <PhoneOff className="w-7 h-7 text-white" />
                  </Button>
                  <p className="text-gray-400 text-sm mt-2">Decline</p>
                </div>
                <div className="text-center">
                  <Button
                    onClick={() => setShowQuickReply(!showQuickReply)}
                    className="w-14 h-14 rounded-full bg-gray-700/80 text-white hover:bg-gray-600 transition-all"
                    title="Reply with message"
                  >
                    <MessageSquare className="w-6 h-6" />
                  </Button>
                  <p className="text-gray-400 text-sm mt-2">Reply</p>
                </div>
                <div className="text-center">
                  <Button
                    onClick={answerCall}
                    className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30 transition-transform hover:scale-105 animate-bounce"
                  >
                    <Phone className="w-7 h-7 text-white" />
                  </Button>
                  <p className="text-gray-400 text-sm mt-2">Accept</p>
                </div>
              </div>
            </div>
          )}

          {/* Active call controls — two rows */}
          {(callState === 'calling' || callState === 'connected' || callState === 'reconnecting' || callState === 'held') && (
            <div className="space-y-3">
              {/* Call waiting banner */}
              {waitingCall && (
                <div className="flex items-center justify-between bg-yellow-500/20 text-yellow-300 rounded-xl px-4 py-2 mx-auto max-w-md">
                  <div className="flex items-center gap-2">
                    <PhoneIncoming className="w-4 h-4 animate-pulse" />
                    <span className="text-sm font-medium">{waitingCall.callerName}</span>
                    <span className="text-xs opacity-70">{waitingCall.callType} call</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={rejectWaitingCall}
                      className="p-1.5 rounded-full bg-red-500/30 hover:bg-red-500/50 transition-colors"
                      title="Reject waiting call"
                    >
                      <PhoneOff className="w-3.5 h-3.5 text-red-300" />
                    </button>
                    <button
                      onClick={acceptWaitingCall}
                      className="p-1.5 rounded-full bg-green-500/30 hover:bg-green-500/50 transition-colors"
                      title="Accept waiting call (ends current)"
                    >
                      <Phone className="w-3.5 h-3.5 text-green-300" />
                    </button>
                  </div>
                </div>
              )}

              {/* On-hold banner */}
              {callState === 'held' && (
                <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm animate-pulse">
                  <Pause className="w-4 h-4" />
                  <span>Call on hold</span>
                </div>
              )}

              {/* Secondary controls row */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={toggleNoiseCancellation}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                    isNoiseCancellation ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                  title="Noise cancellation"
                >
                  <AudioLines className="w-3.5 h-3.5" />
                  Noise Cancel
                </button>
                <button
                  onClick={toggleRecording}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                    isRecording ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                  title="Record call"
                >
                  <Circle className={`w-3.5 h-3.5 ${isRecording ? 'fill-red-400 animate-pulse' : ''}`} />
                  {isRecording ? 'Recording' : 'Record'}
                </button>
                {isVideoCall && (
                  <button
                    onClick={toggleScreenShare}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                      isScreenSharing ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                    title="Screen share"
                  >
                    {isScreenSharing ? <MonitorOff className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                    {isScreenSharing ? 'Stop Share' : 'Share Screen'}
                  </button>
                )}
                {callState === 'connected' && (
                  <button
                    onClick={() => {
                      const name = prompt('Enter participant name to add:');
                      if (name) {
                        const id = `user-${Date.now()}`;
                        addParticipant(id, name);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors bg-white/5 text-gray-400 hover:bg-white/10"
                    title="Add participant to call"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add
                  </button>
                )}
              </div>

              {/* Primary controls row */}
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <Button
                    onClick={toggleMute}
                    className={`w-14 h-14 rounded-full transition-all ${
                      isMuted 
                        ? 'bg-white text-gray-900 hover:bg-gray-200' 
                        : 'bg-gray-700/80 text-white hover:bg-gray-600'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </Button>
                  <p className="text-gray-400 text-xs mt-1.5">{isMuted ? 'Unmute' : 'Mute'}</p>
                </div>

                <div className="text-center">
                  <Button
                    onClick={toggleSpeaker}
                    className={`w-14 h-14 rounded-full transition-all ${
                      isSpeakerOn 
                        ? 'bg-white text-gray-900 hover:bg-gray-200' 
                        : 'bg-gray-700/80 text-white hover:bg-gray-600'
                    }`}
                  >
                    {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                  </Button>
                  <p className="text-gray-400 text-xs mt-1.5">{isSpeakerOn ? 'Speaker' : 'Earpiece'}</p>
                </div>

                {(callState === 'connected' || callState === 'held') && (
                  <div className="text-center">
                    <Button
                      onClick={toggleHold}
                      className={`w-14 h-14 rounded-full transition-all ${
                        isOnHold 
                          ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                          : 'bg-gray-700/80 text-white hover:bg-gray-600'
                      }`}
                    >
                      {isOnHold ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                    </Button>
                    <p className="text-gray-400 text-xs mt-1.5">{isOnHold ? 'Resume' : 'Hold'}</p>
                  </div>
                )}

                {isVideoCall && (
                  <>
                    <div className="text-center">
                      <Button
                        onClick={toggleVideo}
                        className={`w-14 h-14 rounded-full transition-all ${
                          isVideoOff 
                            ? 'bg-white text-gray-900 hover:bg-gray-200' 
                            : 'bg-gray-700/80 text-white hover:bg-gray-600'
                        }`}
                      >
                        {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                      </Button>
                      <p className="text-gray-400 text-xs mt-1.5">{isVideoOff ? 'Camera On' : 'Camera Off'}</p>
                    </div>
                    <div className="text-center">
                      <Button
                        onClick={switchCamera}
                        className="w-14 h-14 rounded-full bg-gray-700/80 text-white hover:bg-gray-600 transition-all"
                      >
                        <SwitchCamera className="w-6 h-6" />
                      </Button>
                      <p className="text-gray-400 text-xs mt-1.5">Flip</p>
                    </div>
                  </>
                )}

                <div className="text-center">
                  <Button
                    onClick={endCall}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-transform hover:scale-105"
                  >
                    <PhoneOff className="w-7 h-7 text-white" />
                  </Button>
                  <p className="text-gray-400 text-xs mt-1.5">End</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
