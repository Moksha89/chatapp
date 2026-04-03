import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useCall } from '../context/CallContext';
import { socketService } from '../services/socket';
import { api } from '../services/api';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { MessageContextMenu, MessageReactions, EditMessageDialog } from './MessageContextMenu';
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
  ArrowLeft,
  Search,
  Star,
  Reply,
  MoreVertical,
  Pin,
  MapPin,
  User,
  Smile,
  BarChart3,
  Timer,
  Lock
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
  const { activeChat, messages, isLoadingMessages, sendMessage, typingUsers, selectChat, addReaction, removeReaction, editMessage, deleteMessage, toggleStar, forwardMessage, replyingTo, setReplyingTo, chats } = useChat();
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
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const [showForwardDialog, setShowForwardDialog] = useState<string | null>(null);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [showDisappearingDialog, setShowDisappearingDialog] = useState(false);
  const [showWallpaperDialog, setShowWallpaperDialog] = useState(false);
  const [showStarredMessages, setShowStarredMessages] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [starredMessages, setStarredMessages] = useState<typeof messages>([]);
  
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

    sendMessage(inputValue.trim(), replyingTo?.id);
    setInputValue('');
    setReplyingTo(null);

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
            onClick={() => setShowSearchBar(!showSearchBar)}
            title="Search"
            className="text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-full"
          >
            <Search className="h-5 w-5" />
          </Button>
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
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-full"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
            {showChatMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowChatMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg py-1 min-w-[200px] z-50">
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowDisappearingDialog(true); }}>
                    <Timer className="h-4 w-4" /> Disappearing messages
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={async () => { setShowChatMenu(false); if (activeChat) { try { await api.toggleChatLock(activeChat.id); } catch {} } }}>
                    <Lock className="h-4 w-4" /> {activeChat?.isLocked ? 'Unlock chat' : 'Lock chat'}
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={async () => { setShowChatMenu(false); setShowStarredMessages(true); try { const msgs = await api.getStarredMessages(); setStarredMessages(msgs); } catch {} }}>
                    <Star className="h-4 w-4" /> Starred messages
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowWallpaperDialog(true); }}>
                    <Image className="h-4 w-4" /> Chat wallpaper
                  </button>
                  {activeChat?.pinnedMessageId ? (
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={async () => { setShowChatMenu(false); if (activeChat) { try { await api.pinMessage(activeChat.id, null); } catch {} } }}>
                      <Pin className="h-4 w-4" /> Unpin message
                    </button>
                  ) : null}
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={async () => { setShowChatMenu(false); if (activeChat) { try { const data = await api.exportChat(activeChat.id); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `chat-export-${activeChat.id}.json`; a.click(); URL.revokeObjectURL(url); } catch {} } }}>
                    <Download className="h-4 w-4" /> Export chat
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {showSearchBar && (
        <div className="px-4 py-2 bg-white border-b flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            className="flex-1 text-sm border-none outline-none bg-transparent"
            value={chatSearchQuery}
            onChange={(e) => setChatSearchQuery(e.target.value)}
            autoFocus
          />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowSearchBar(false); setChatSearchQuery(''); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

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
            {(chatSearchQuery ? messages.filter(m => m.content?.toLowerCase().includes(chatSearchQuery.toLowerCase())) : messages).map((message) => {
              const isOwn = message.senderId === user?.id;
              const isMedia = ['image', 'video', 'audio', 'video-note', 'file', 'poll', 'location', 'contact'].includes(message.type);
              const replyToMsg = message.replyToMessageId ? messages.find(m => m.id === message.replyToMessageId) : null;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                >
                  <div className={`flex items-start gap-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <div
                      className={`max-w-[70%] lg:max-w-[50%] px-3 py-2 rounded-lg shadow-sm ${
                        isOwn
                          ? 'bg-[#d9fdd3] rounded-tr-none'
                          : 'bg-white rounded-tl-none'
                      } ${message.isDeleted ? 'opacity-60 italic' : ''}`}
                    >
                      {/* Reply preview */}
                      {replyToMsg && !message.isDeleted && (
                        <div className="border-l-4 border-green-500 bg-black/5 rounded px-2 py-1 mb-1 text-xs">
                          <p className="font-medium text-green-700 truncate">
                            {replyToMsg.senderId === user?.id ? 'You' : 'Them'}
                          </p>
                          <p className="text-gray-600 truncate">{replyToMsg.content}</p>
                        </div>
                      )}
                      {/* Forwarded indicator */}
                      {message.forwardedFrom && !message.isDeleted && (
                        <p className="text-[10px] text-gray-400 italic mb-1">Forwarded</p>
                      )}
                      {message.isDeleted ? (
                        <p className="text-sm text-gray-500">This message was deleted</p>
                      ) : message.type === 'poll' ? (
                        renderPollContent(message)
                      ) : message.type === 'location' ? (
                        renderLocationContent(message)
                      ) : message.type === 'contact' ? (
                        renderContactCardContent(message)
                      ) : isMedia ? (
                        renderMediaContent(message)
                      ) : (
                        <p className="text-sm break-words text-gray-800">{message.content}</p>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        {message.isStarred && !message.isDeleted && (
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        )}
                        {message.isEdited && !message.isDeleted && (
                          <span className="text-[10px] text-gray-400">edited</span>
                        )}
                        <span className="text-[10px] text-gray-500">
                          {formatMessageTime(message.createdAt)}
                        </span>
                        {isOwn && getStatusIcon(message.status)}
                      </div>
                      {message.reactions && Object.keys(message.reactions).length > 0 && !message.isDeleted && (
                        <MessageReactions
                          reactions={message.reactions}
                          userId={user?.id || ''}
                          onAddReaction={(emoji) => addReaction(message.id, emoji)}
                          onRemoveReaction={(emoji) => removeReaction(message.id, emoji)}
                        />
                      )}
                    </div>
                    {!message.isDeleted && (
                      <MessageContextMenu
                        messageId={message.id}
                        content={message.content || ''}
                        isOwn={isOwn}
                        isDeleted={message.isDeleted}
                        reactions={message.reactions}
                        userId={user?.id || ''}
                        createdAt={message.createdAt}
                        onAddReaction={(emoji) => addReaction(message.id, emoji)}
                        onRemoveReaction={(emoji) => removeReaction(message.id, emoji)}
                        onEdit={() => setEditingMessage({ id: message.id, content: message.content || '' })}
                        onDelete={(deleteForEveryone) => deleteMessage(message.id, deleteForEveryone)}
                        onCopy={() => navigator.clipboard.writeText(message.content || '')}
                        onReply={() => setReplyingTo(message)}
                        onStar={() => toggleStar(message.id)}
                        onForward={() => setShowForwardDialog(message.id)}
                      />
                    )}
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

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-white border-t flex items-center gap-3">
          <div className="border-l-4 border-green-500 pl-2 flex-1 min-w-0">
            <p className="text-xs font-medium text-green-700">
              {replyingTo.senderId === user?.id ? 'You' : 'Them'}
            </p>
            <p className="text-xs text-gray-500 truncate">{replyingTo.content}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReplyingTo(null)}>
            <X className="h-4 w-4" />
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
                  <button
                    onClick={() => { setShowAttachMenu(false); setShowPollCreator(true); }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Poll</span>
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); setShowLocationPicker(true); }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Location</span>
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); setShowContactPicker(true); }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Contact</span>
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

      {/* Edit Message Dialog */}
      <EditMessageDialog
        isOpen={!!editingMessage}
        content={editingMessage?.content || ''}
        onSave={async (newContent) => {
          if (editingMessage) {
            await editMessage(editingMessage.id, newContent);
            setEditingMessage(null);
          }
        }}
        onCancel={() => setEditingMessage(null)}
      />

      {/* Forward Dialog */}
      {showForwardDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[60vh] flex flex-col">
            <h3 className="font-semibold mb-3">Forward to...</h3>
            <div className="flex-1 overflow-y-auto space-y-1">
              {chats.filter(c => c.id !== activeChat?.id).map(chat => {
                const chatName = chat.name || chat.participants.find(p => p.userId !== user?.id)?.user?.displayName || 'Unknown';
                return (
                  <button
                    key={chat.id}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded-lg flex items-center gap-3"
                    onClick={async () => {
                      if (showForwardDialog) {
                        await forwardMessage(showForwardDialog, chat.id);
                        setShowForwardDialog(null);
                      }
                    }}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-green-500 text-white text-xs">
                        {chatName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{chatName}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={() => setShowForwardDialog(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Disappearing Messages Dialog */}
      {showDisappearingDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Disappearing Messages</h3>
            <p className="text-sm text-gray-500 mb-4">Messages will disappear after the selected duration.</p>
            <div className="space-y-2">
              {[{label: 'Off', value: null}, {label: '24 hours', value: 86400}, {label: '7 days', value: 604800}, {label: '90 days', value: 7776000}].map(opt => (
                <button
                  key={opt.label}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                  onClick={async () => {
                    if (activeChat) {
                      try { await api.setDisappearingMessages(activeChat.id, opt.value); } catch {}
                    }
                    setShowDisappearingDialog(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={() => setShowDisappearingDialog(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Wallpaper Dialog */}
      {showWallpaperDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Chat Wallpaper</h3>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {['default', '#d9fdd3', '#fde4cf', '#cff4fc', '#f0d9ff', '#ffe4e1', '#e8f5e9', '#fff3e0', '#e3f2fd', '#fce4ec', '#f3e5f5', '#e0f7fa'].map(color => (
                <button
                  key={color}
                  className="w-full aspect-square rounded-lg border-2 border-gray-200 hover:border-green-500"
                  style={{ backgroundColor: color === 'default' ? '#efeae2' : color }}
                  onClick={async () => {
                    if (activeChat) {
                      try { await api.setChatWallpaper(activeChat.id, color === 'default' ? null : color); } catch {}
                    }
                    setShowWallpaperDialog(false);
                  }}
                />
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowWallpaperDialog(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Starred Messages Panel */}
      {showStarredMessages && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Starred Messages</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowStarredMessages(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {starredMessages.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No starred messages</p>
              ) : starredMessages.map(msg => (
                <div key={msg.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(msg.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Poll Creator Dialog */}
      {showPollCreator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Create Poll</h3>
            <input
              type="text"
              placeholder="Ask a question"
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
            />
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...pollOptions];
                    newOpts[i] = e.target.value;
                    setPollOptions(newOpts);
                  }}
                />
                {pollOptions.length > 2 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {pollOptions.length < 12 && (
              <button className="text-sm text-green-600 hover:text-green-700 mb-3" onClick={() => setPollOptions([...pollOptions, ''])}>
                + Add option
              </button>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => { setShowPollCreator(false); setPollQuestion(''); setPollOptions(['', '']); }}>Cancel</Button>
              <Button
                className="bg-green-500 hover:bg-green-600"
                disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                onClick={() => {
                  const pollData = JSON.stringify({
                    question: pollQuestion,
                    options: pollOptions.filter(o => o.trim()).map(text => ({ text, votes: 0, voters: [] }))
                  });
                  sendMessage(pollData);
                  setShowPollCreator(false);
                  setPollQuestion('');
                  setPollOptions(['', '']);
                }}
              >Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* Location Picker Dialog */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Share Location</h3>
            <p className="text-sm text-gray-500 mb-4">Share your current location or enter coordinates manually.</p>
            <Button
              className="w-full bg-green-500 hover:bg-green-600 mb-3"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const locData = JSON.stringify({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        name: 'My Location'
                      });
                      sendMessage(locData);
                      setShowLocationPicker(false);
                    },
                    () => {
                      const locData = JSON.stringify({ latitude: 0, longitude: 0, name: 'Location (permission denied)' });
                      sendMessage(locData);
                      setShowLocationPicker(false);
                    }
                  );
                }
              }}
            >
              <MapPin className="h-4 w-4 mr-2" /> Share Current Location
            </Button>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowLocationPicker(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Picker Dialog */}
      {showContactPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[60vh] flex flex-col">
            <h3 className="font-semibold mb-3">Share Contact</h3>
            <div className="flex-1 overflow-y-auto space-y-1">
              {chats.map(chat => {
                const otherUser = chat.participants.find(p => p.userId !== user?.id)?.user;
                if (!otherUser) return null;
                return (
                  <button
                    key={otherUser.id}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 rounded-lg flex items-center gap-3"
                    onClick={() => {
                      const contactData = JSON.stringify({
                        name: otherUser.displayName,
                        phoneNumber: otherUser.phoneNumber
                      });
                      sendMessage(contactData);
                      setShowContactPicker(false);
                    }}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-500 text-white text-xs">
                        {otherUser.displayName?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{otherUser.displayName}</p>
                      <p className="text-xs text-gray-500">{otherUser.phoneNumber}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={() => setShowContactPicker(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Render poll content
function renderPollContent(message: { content?: string }) {
  try {
    const poll = JSON.parse(message.content || '{}');
    return (
      <div className="min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-green-600" />
          <span className="font-medium text-sm">{poll.question}</span>
        </div>
        {poll.options?.map((opt: { text: string; votes: number }, i: number) => (
          <div key={i} className="mb-1">
            <div className="flex justify-between text-xs text-gray-600 mb-0.5">
              <span>{opt.text}</span>
              <span>{opt.votes || 0}</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (opt.votes || 0) * 20)}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  } catch {
    return <p className="text-sm">{message.content}</p>;
  }
}

// Render location content
function renderLocationContent(message: { content?: string }) {
  try {
    const loc = JSON.parse(message.content || '{}');
    return (
      <div className="min-w-[200px]">
        <div className="bg-green-50 rounded-lg p-3 flex items-center gap-2">
          <MapPin className="h-6 w-6 text-red-500" />
          <div>
            <p className="text-sm font-medium">{loc.name || 'Location'}</p>
            <p className="text-xs text-gray-500">{loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}</p>
          </div>
        </div>
      </div>
    );
  } catch {
    return <p className="text-sm">{message.content}</p>;
  }
}

// Render contact card
function renderContactCardContent(message: { content?: string }) {
  try {
    const contact = JSON.parse(message.content || '{}');
    return (
      <div className="min-w-[200px]">
        <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-2">
          <User className="h-6 w-6 text-blue-500" />
          <div>
            <p className="text-sm font-medium">{contact.name || 'Contact'}</p>
            <p className="text-xs text-gray-500">{contact.phoneNumber || ''}</p>
          </div>
        </div>
      </div>
    );
  } catch {
    return <p className="text-sm">{message.content}</p>;
  }
}
