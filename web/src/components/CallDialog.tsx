import { useEffect, useRef } from 'react';
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

  if (callState === 'idle' || !callInfo) {
    return null;
  }

  const isVideoCall = callInfo.callType === 'video';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Video area */}
        {isVideoCall && (
          <div className="relative aspect-video bg-gray-800">
            {/* Remote video (full size) */}
            {remoteStream && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Placeholder when no remote video */}
            {!remoteStream && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl text-white font-semibold">
                      {callInfo.peerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-white text-xl font-medium">{callInfo.peerName}</p>
                  <p className="text-gray-400 mt-2">
                    {callState === 'calling' && 'Calling...'}
                    {callState === 'incoming' && 'Incoming call...'}
                    {callState === 'connected' && 'Connected'}
                  </p>
                </div>
              </div>
            )}

            {/* Local video (picture-in-picture) */}
            {localStream && (
              <div className="absolute bottom-4 right-4 w-32 h-24 rounded-lg overflow-hidden border-2 border-white/20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        )}

        {/* Audio call UI */}
        {!isVideoCall && (
          <div className="py-16 px-8 text-center">
            <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl text-white font-semibold">
                {callInfo.peerName.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-white text-2xl font-medium">{callInfo.peerName}</p>
            <p className="text-gray-400 mt-2 text-lg">
              {callState === 'calling' && 'Calling...'}
              {callState === 'incoming' && 'Incoming voice call...'}
              {callState === 'connected' && 'Connected'}
            </p>
          </div>
        )}

        {/* Call controls */}
        <div className="p-6 bg-gray-800/50">
          <div className="flex items-center justify-center gap-4">
            {/* Incoming call: Answer/Reject buttons */}
            {callState === 'incoming' && (
              <>
                <Button
                  onClick={rejectCall}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <PhoneOff className="w-8 h-8 text-white" />
                </Button>
                <Button
                  onClick={answerCall}
                  className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
                >
                  <Phone className="w-8 h-8 text-white" />
                </Button>
              </>
            )}

            {/* Active call: Mute/Video/End buttons */}
            {(callState === 'calling' || callState === 'connected') && (
              <>
                <Button
                  onClick={toggleMute}
                  variant="ghost"
                  className={`w-14 h-14 rounded-full ${
                    isMuted ? 'bg-red-500/20 text-red-500' : 'bg-gray-700 text-white'
                  }`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>

                {isVideoCall && (
                  <Button
                    onClick={toggleVideo}
                    variant="ghost"
                    className={`w-14 h-14 rounded-full ${
                      isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-gray-700 text-white'
                    }`}
                  >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </Button>
                )}

                <Button
                  onClick={endCall}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <PhoneOff className="w-8 h-8 text-white" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
