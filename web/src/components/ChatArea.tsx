import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useCall } from '../context/CallContext';
import { socketService } from '../services/socket';
import { api } from '../services/api';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { 
  Send, 
  Check, 
  CheckCheck, 
  Clock, 
  MessageCircle, 
  Phone, 
  Video,
  Paperclip,
  Mic,
  X,
  Image,
  FileText,
  Camera,
  Download,
  ArrowLeft
} from 'lucide-react';

interface MediaMessage {
  type: 'image' | 'video' | 'audio' | 'video-note' | 'file';
  mediaUrl: string;
  mediaType: string;
  mediaName: string;
  mediaSize: number;
  mediaDuration?: number;
}

type RecordingState = 'idle' | 'recording';

export function ChatArea() {
  const { user } = useAuth();
  const { activeChat, messages, isLoadingMessages, sendMessage, typingUsers, selectChat } = useChat();
  const { initiateCall, callState } = useCall();
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [isVideoNote, setIsVideoNote] = useState(false);
  const [videoPreviewStream, setVideoPreviewStream] = useState<MediaStream | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (videoPreviewStream) {
        videoPreviewStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoPreviewStream]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);

    if (activeChat && !isTyping) {
      setIsTyping(true);
      socketService.startTyping(activeChat.id);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (activeChat) {
        socketService.stopTyping(activeChat.id);
        setIsTyping(false);
      }
    }, 2000);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !activeChat) return;

    sendMessage(inputValue.trim());
    setInputValue('');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTyping && activeChat) {
      socketService.stopTyping(activeChat.id);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const uploadAndSendMedia = useCallback(async (file: File, type: MediaMessage['type']) => {
    if (!activeChat) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await api.uploadMedia(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      await api.sendMediaMessage(activeChat.id, {
        content: file.name,
        type,
        mediaUrl: result.url,
        mediaType: result.mimeType,
        mediaName: result.filename,
        mediaSize: result.size,
        tempId: `temp-${Date.now()}`,
      });

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error('Failed to upload media:', error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [activeChat]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: MediaMessage['type']) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAndSendMedia(file, type);
    }
    e.target.value = '';
    setShowAttachMenu(false);
  }, [uploadAndSendMedia]);

  const startAudioRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        await uploadAndSendMedia(audioFile, 'audio');
      };

      mediaRecorder.start();
      setRecordingState('recording');
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to start audio recording:', error);
    }
  }, [uploadAndSendMedia]);

  const startVideoNoteRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setVideoPreviewStream(stream);
      setIsVideoNote(true);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setVideoPreviewStream(null);
        setIsVideoNote(false);
        const videoBlob = new Blob(audioChunksRef.current, { type: 'video/webm' });
        const videoFile = new File([videoBlob], `video-note-${Date.now()}.webm`, { type: 'video/webm' });
        await uploadAndSendMedia(videoFile, 'video-note');
      };

      mediaRecorder.start();
      setRecordingState('recording');
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to start video recording:', error);
    }
  }, [uploadAndSendMedia]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setRecordingState('idle');
    setRecordingTime(0);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    if (videoPreviewStream) {
      videoPreviewStream.getTracks().forEach(track => track.stop());
      setVideoPreviewStream(null);
    }
    setRecordingState('idle');
    setRecordingTime(0);
    setIsVideoNote(false);
  }, [videoPreviewStream]);

  const getChatName = () => {
    if (!activeChat) return '';
    if (activeChat.name) return activeChat.name;
    const otherParticipant = activeChat.participants.find((p) => p.userId !== user?.id);
    return otherParticipant?.user?.displayName || 'Unknown';
  };

  const getChatInitials = () => {
    const name = getChatName();
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getOtherParticipantId = () => {
    if (!activeChat) return null;
    const otherParticipant = activeChat.participants.find((p) => p.userId !== user?.id);
    return otherParticipant?.userId || null;
  };

  const handleVoiceCall = () => {
    const targetUserId = getOtherParticipantId();
    if (targetUserId && callState === 'idle') {
      initiateCall(targetUserId, getChatName(), 'audio');
    }
  };

  const handleVideoCall = () => {
    const targetUserId = getOtherParticipantId();
    if (targetUserId && callState === 'idle') {
      initiateCall(targetUserId, getChatName(), 'video');
    }
  };

  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const renderMediaContent = (message: {
    type: string;
    content?: string;
    mediaUrl?: string;
    mediaType?: string;
    mediaName?: string;
    mediaSize?: number;
  }) => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const mediaUrl = message.mediaUrl ? `${baseUrl}${message.mediaUrl}` : '';

    switch (message.type) {
      case 'image':
        return (
          <div className="max-w-xs">
            <img 
              src={mediaUrl} 
              alt={message.mediaName || 'Image'} 
              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(mediaUrl, '_blank')}
            />
          </div>
        );
      case 'video':
      case 'video-note':
        return (
          <div className={message.type === 'video-note' ? 'w-48 h-48 rounded-full overflow-hidden' : 'max-w-xs'}>
            <video 
              src={mediaUrl} 
              controls 
              className={message.type === 'video-note' ? 'w-full h-full object-cover' : 'rounded-lg max-w-full'}
            />
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <audio src={mediaUrl} controls className="w-full h-10" />
          </div>
        );
      case 'file':
        return (
          <a 
            href={mediaUrl} 
            download={message.mediaName}
            className="flex items-center gap-3 p-3 bg-white/50 rounded-lg hover:bg-white/70 transition-colors"
          >
            <FileText className="h-8 w-8 text-gray-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.mediaName}</p>
              <p className="text-xs text-gray-500">{formatFileSize(message.mediaSize || 0)}</p>
            </div>
            <Download className="h-5 w-5 text-gray-400" />
          </a>
        );
      default:
        return <p className="text-sm break-words">{message.content}</p>;
    }
  };

  const chatTypingUsers = activeChat ? typingUsers.get(activeChat.id) : undefined;
  const isOtherTyping = chatTypingUsers && chatTypingUsers.size > 0;

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center max-w-md px-6">
          <div className="bg-gradient-to-br from-green-400 to-green-600 p-8 rounded-full inline-block mb-6 shadow-lg">
            <MessageCircle className="h-20 w-20 text-white" />
          </div>
          <h2 className="text-3xl font-light text-gray-800 mb-3">WhatsApp Business Chat</h2>
          <p className="text-gray-500 text-lg">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#efeae2]">
      {/* Chat Header */}
      <div className="px-2 md:px-4 py-3 bg-[#f0f2f5] flex items-center border-b border-gray-200 shadow-sm">
        {/* Back button for mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => selectChat(null)}
          className="md:hidden text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-full mr-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10 mr-3 ring-2 ring-green-500/20">
          <AvatarFallback className="bg-gradient-to-br from-green-400 to-green-600 text-white font-medium">
            {getChatInitials()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{getChatName()}</h3>
          {isOtherTyping && (
            <p className="text-xs text-green-600 font-medium">typing...</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleVoiceCall}
            disabled={callState !== 'idle'}
            title="Voice Call"
            className="text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-full"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleVideoCall}
            disabled={callState !== 'idle'}
            title="Video Call"
            className="text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-full"
          >
            <Video className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-gray-500">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 bg-white/80 px-6 py-4 rounded-lg shadow-sm">
              <p>No messages yet</p>
              <p className="text-sm mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => {
              const isOwn = message.senderId === user?.id;
              const isMedia = ['image', 'video', 'audio', 'video-note', 'file'].includes(message.type);
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] lg:max-w-[50%] px-3 py-2 rounded-lg shadow-sm ${
                      isOwn
                        ? 'bg-[#d9fdd3] rounded-tr-none'
                        : 'bg-white rounded-tl-none'
                    }`}
                  >
                    {isMedia ? (
                      renderMediaContent(message)
                    ) : (
                      <p className="text-sm break-words text-gray-800">{message.content}</p>
                    )}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-gray-500">
                        {formatMessageTime(message.createdAt)}
                      </span>
                      {isOwn && getStatusIcon(message.status)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Upload Progress */}
      {isUploading && (
        <div className="px-4 py-2 bg-white border-t">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-sm text-gray-500">{uploadProgress}%</span>
          </div>
        </div>
      )}

      {/* Recording UI */}
      {recordingState === 'recording' && (
        <div className="px-4 py-3 bg-white border-t flex items-center gap-4">
          {isVideoNote && (
            <div className="w-16 h-16 rounded-full overflow-hidden bg-black">
              <video 
                ref={videoPreviewRef} 
                autoPlay 
                muted 
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-500 font-medium">{formatRecordingTime(recordingTime)}</span>
            <span className="text-gray-500 text-sm">
              {isVideoNote ? 'Recording video note...' : 'Recording voice message...'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            className="text-gray-500 hover:text-red-500"
          >
            <X className="h-5 w-5" />
          </Button>
          <Button
            onClick={stopRecording}
            className="bg-green-500 hover:bg-green-600 rounded-full"
            size="icon"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Message Input */}
      {recordingState === 'idle' && (
        <div className="px-4 py-3 bg-[#f0f2f5]">
          <div className="flex items-end gap-2">
            {/* Attach Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              
              {showAttachMenu && (
                <div className="absolute bottom-12 left-0 bg-white rounded-lg shadow-lg p-2 flex flex-col gap-1 min-w-[160px] z-10">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <Image className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Photo</span>
                  </button>
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <Video className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Video</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Document</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAttachMenu(false);
                      startVideoNoteRecording();
                    }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Video Note</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'image')}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'video')}
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'file')}
            />

            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                placeholder="Type a message"
                className="w-full px-4 py-2.5 bg-white rounded-3xl border-0 focus:ring-2 focus:ring-green-500/20 resize-none text-sm"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                style={{ minHeight: '42px', maxHeight: '120px' }}
              />
            </div>

            {/* Send or Mic Button */}
            {inputValue.trim() ? (
              <Button
                onClick={handleSend}
                className="bg-green-500 hover:bg-green-600 rounded-full h-10 w-10"
                size="icon"
              >
                <Send className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                onClick={startAudioRecording}
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full h-10 w-10"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close attach menu */}
      {showAttachMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowAttachMenu(false)}
        />
      )}
    </div>
  );
}
