import { useEffect, useRef, useState } from 'react';
import { useCall } from '../context/CallContext';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import { Button } from './ui/button';

export function CallDialog() {
  const {
    callState,
    callInfo,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

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

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (callState === 'connected') {
      setCallDuration(0);
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callState === 'idle' || !callInfo) {
    return null;
  }

  const isVideoCall = callInfo.callType === 'video';

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
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
              <p className="font-medium">{callInfo.peerName}</p>
              <p className="text-sm text-gray-400">
                {callState === 'calling' && 'Calling...'}
                {callState === 'incoming' && 'Incoming call'}
                {callState === 'connected' && formatDuration(callDuration)}
              </p>
            </div>
          </div>
          {callState !== 'incoming' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={endCall}
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Main content area */}
        <div 
          className="flex-1 relative overflow-hidden rounded-2xl mx-4"
          onClick={() => isVideoCall && setShowControls(!showControls)}
        >
          {/* Video call UI */}
          {isVideoCall && (
            <>
              {/* Remote video (full size) */}
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

              {/* Local video (picture-in-picture) */}
              {localStream && (
                <div className="absolute bottom-4 right-4 w-36 h-48 md:w-48 md:h-36 rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl bg-gray-900">
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
                </div>
              )}
            </>
          )}

          {/* Audio call UI */}
          {!isVideoCall && (
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
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Call controls */}
        <div className={`p-6 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-center gap-6">
            {/* Incoming call: Answer/Reject buttons */}
            {callState === 'incoming' && (
              <>
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
                    onClick={answerCall}
                    className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30 transition-transform hover:scale-105 animate-bounce"
                  >
                    <Phone className="w-7 h-7 text-white" />
                  </Button>
                  <p className="text-gray-400 text-sm mt-2">Accept</p>
                </div>
              </>
            )}

            {/* Active call: Mute/Video/End buttons */}
            {(callState === 'calling' || callState === 'connected') && (
              <>
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
                  <p className="text-gray-400 text-xs mt-2">{isMuted ? 'Unmute' : 'Mute'}</p>
                </div>

                {isVideoCall && (
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
                    <p className="text-gray-400 text-xs mt-2">{isVideoOff ? 'Start Video' : 'Stop Video'}</p>
                  </div>
                )}

                <div className="text-center">
                  <Button
                    onClick={endCall}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-transform hover:scale-105"
                  >
                    <PhoneOff className="w-7 h-7 text-white" />
                  </Button>
                  <p className="text-gray-400 text-xs mt-2">End</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
