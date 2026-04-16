import { useState, useEffect, useRef, useCallback } from 'react'
import { getSocket } from '../lib/socket'
import { useAuth } from '../lib/auth'
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff } from 'lucide-react'
import Peer, { type MediaConnection } from 'peerjs'

type CallState = 'idle' | 'outgoing' | 'incoming' | 'connected'

interface CallInfo {
  targetUserId: string
  callType: 'audio' | 'video'
  callerName?: string
  peerId?: string
  targetUser?: { displayName?: string; phone?: string }
}

export default function CallDialog() {
  const { user } = useAuth()
  const [callState, setCallState] = useState<CallState>('idle')
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [duration, setDuration] = useState(0)

  const peerRef = useRef<Peer | null>(null)
  const callRef = useRef<MediaConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const cleanup = useCallback(() => {
    if (callRef.current) {
      callRef.current.close()
      callRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }
    clearInterval(timerRef.current)
    setCallState('idle')
    setCallInfo(null)
    setDuration(0)
    setMuted(false)
    setVideoOff(false)
  }, [])

  const initPeer = useCallback((): Promise<Peer> => {
    return new Promise((resolve, reject) => {
      const peerId = `web-${user!.id}-${Date.now()}`
      const peerHost = window.location.hostname
      const peerPort = window.location.port ? parseInt(window.location.port) : (window.location.protocol === 'https:' ? 443 : 80)
      
      const peer = new Peer(peerId, {
        host: peerHost,
        port: peerPort,
        path: '/peer',
        secure: window.location.protocol === 'https:',
      })

      peer.on('open', () => {
        peerRef.current = peer
        resolve(peer)
      })

      peer.on('error', (err) => {
        console.error('[Peer] Error:', err)
        reject(err)
      })

      // Handle incoming calls on this peer
      peer.on('call', (mediaConn) => {
        callRef.current = mediaConn
        // Answer will happen when user accepts
      })
    })
  }, [user])

  const getMedia = async (type: 'audio' | 'video') => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    })
    localStreamRef.current = stream
    if (localVideoRef.current && type === 'video') {
      localVideoRef.current.srcObject = stream
    }
    return stream
  }

  // Listen for outgoing call events from ChatPage
  useEffect(() => {
    const handleCallStart = async (e: CustomEvent<CallInfo>) => {
      const { targetUserId, callType, targetUser } = e.detail
      setCallInfo({ targetUserId, callType, targetUser })
      setCallState('outgoing')

      try {
        const peer = await initPeer()
        const stream = await getMedia(callType)

        const socket = getSocket()
        if (socket) {
          socket.emit('call:initiate', {
            targetUserId,
            callType,
            peerId: peer.id,
          })
        }

        // Wait for answer
        peer.on('call', (mediaConn) => {
          callRef.current = mediaConn
          mediaConn.answer(stream)
          mediaConn.on('stream', (remoteStream) => {
            remoteStreamRef.current = remoteStream
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream
            }
            setCallState('connected')
            timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
          })
          mediaConn.on('close', cleanup)
        })
      } catch (err) {
        console.error('Call init failed:', err)
        cleanup()
      }
    }

    window.addEventListener('call:start', handleCallStart as unknown as EventListener)
    return () => window.removeEventListener('call:start', handleCallStart as unknown as EventListener)
  }, [initPeer, cleanup])

  // Listen for incoming calls via socket
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleIncoming = (data: {
      callerId: string
      callerName: string
      callType: 'audio' | 'video'
      peerId: string
    }) => {
      setCallInfo({
        targetUserId: data.callerId,
        callType: data.callType,
        callerName: data.callerName,
        peerId: data.peerId,
      })
      setCallState('incoming')
    }

    const handleCallEnded = () => cleanup()
    const handleCallRejected = () => cleanup()

    socket.on('call:incoming', handleIncoming)
    socket.on('call:ended', handleCallEnded)
    socket.on('call:rejected', handleCallRejected)

    return () => {
      socket.off('call:incoming', handleIncoming)
      socket.off('call:ended', handleCallEnded)
      socket.off('call:rejected', handleCallRejected)
    }
  }, [cleanup])

  const acceptCall = async () => {
    if (!callInfo?.peerId || !callInfo?.callType) return

    try {
      const peer = await initPeer()
      const stream = await getMedia(callInfo.callType)

      const mediaConn = peer.call(callInfo.peerId, stream)
      callRef.current = mediaConn

      mediaConn.on('stream', (remoteStream) => {
        remoteStreamRef.current = remoteStream
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream
        }
        setCallState('connected')
        timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
      })

      mediaConn.on('close', cleanup)

      const socket = getSocket()
      if (socket) {
        socket.emit('call:answer', { targetUserId: callInfo.targetUserId, peerId: peer.id })
      }
    } catch (err) {
      console.error('Accept call failed:', err)
      cleanup()
    }
  }

  const rejectCall = () => {
    const socket = getSocket()
    if (socket && callInfo) {
      socket.emit('call:reject', { targetUserId: callInfo.targetUserId })
    }
    cleanup()
  }

  const endCall = () => {
    const socket = getSocket()
    if (socket && callInfo) {
      socket.emit('call:end', { targetUserId: callInfo.targetUserId })
    }
    cleanup()
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = muted))
      setMuted(!muted)
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = videoOff))
      setVideoOff(!videoOff)
    }
  }

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (callState === 'idle') return null

  const isVideo = callInfo?.callType === 'video'
  const displayName = callInfo?.callerName || callInfo?.targetUser?.displayName || callInfo?.targetUser?.phone || 'Unknown'

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm mx-4 text-white text-center">
        {/* Video elements (hidden for audio calls) */}
        {isVideo && callState === 'connected' && (
          <div className="relative mb-4 rounded-xl overflow-hidden bg-black aspect-video">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-2 right-2 w-24 h-18 rounded-lg object-cover border-2 border-white/30"
            />
          </div>
        )}

        {/* Call info */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
            {isVideo ? <Video className="w-8 h-8" /> : <Phone className="w-8 h-8" />}
          </div>
          <h3 className="text-xl font-semibold">{displayName}</h3>
          <p className="text-gray-400 mt-1">
            {callState === 'incoming' && `Incoming ${callInfo?.callType} call...`}
            {callState === 'outgoing' && 'Calling...'}
            {callState === 'connected' && formatDuration(duration)}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          {callState === 'incoming' ? (
            <>
              <button onClick={rejectCall} className="p-4 bg-red-600 rounded-full hover:bg-red-700">
                <PhoneOff className="w-6 h-6" />
              </button>
              <button onClick={acceptCall} className="p-4 bg-green-600 rounded-full hover:bg-green-700">
                <Phone className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              <button onClick={toggleMute} className={`p-3 rounded-full ${muted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              {isVideo && (
                <button onClick={toggleVideo} className={`p-3 rounded-full ${videoOff ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                  {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}
              <button onClick={endCall} className="p-4 bg-red-600 rounded-full hover:bg-red-700">
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
