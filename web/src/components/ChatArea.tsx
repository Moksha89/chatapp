import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useCall } from '../context/CallContext';
import { useToast } from './Toast';
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
  MoreVertical,
  Pin,
  MapPin,
  User,
  BarChart3,
  Timer,
  Lock,
  Eye,
  EyeOff,
  Bot,
  ShoppingCart,
  FileDown,
  Smile
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
  const { showError } = useToast();
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
  const [showDisappearingDialog, setShowDisappearingDialog] = useState(false);
  const [showWallpaperDialog, setShowWallpaperDialog] = useState(false);
  const [showStarredMessages, setShowStarredMessages] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [starredMessages, setStarredMessages] = useState<Array<{ id: string; chatId: string; senderId: string; content: string; type: string; createdAt: string; isStarred: boolean; status?: string }>>([]);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifResults, setGifResults] = useState<Array<{ id: string; title: string; media_formats: { gif: { url: string }; tinygif: { url: string } } }>>([]);
  const [isLoadingGifs, setIsLoadingGifs] = useState(false);
  const [showChatbotDialog, setShowChatbotDialog] = useState(false);
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [chatbotRules, setChatbotRules] = useState<Array<{ trigger: string; response: string }>>([{ trigger: '', response: '' }]);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; name: string; price: number; quantity: number }>>([{ productId: '', name: '', price: 0, quantity: 1 }]);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [viewOnceMode, setViewOnceMode] = useState(false);
  
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
      showError('Failed to upload media', 'Please try again');
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [activeChat, showError]);

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
      showError('Microphone access denied', 'Please enable microphone permissions');
    }
  }, [uploadAndSendMedia, showError]);

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
      showError('Camera access denied', 'Please enable camera permissions');
    }
  }, [uploadAndSendMedia, showError]);

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
      <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
        <div className="text-center max-w-md px-6 fade-in">
          <div className="bg-gradient-to-br from-[#00a884] to-[#008069] p-8 rounded-full inline-block mb-6 shadow-lg">
            <MessageCircle className="h-20 w-20 text-white" />
          </div>
          <h2 className="text-3xl font-light text-gray-700 mb-3">WhatsApp Business</h2>
          <p className="text-gray-500 text-base mb-6">Send and receive messages without keeping your phone online.</p>
          <p className="text-gray-400 text-sm">Use on up to 4 linked devices and 1 phone at the same time.</p>
          <a
            href="/version/download/android"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#00a884] hover:bg-[#008069] text-white rounded-full text-sm font-medium shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            Download Android App
          </a>
          <div className="encryption-banner mt-8 inline-flex items-center gap-2 mx-auto">
            <Lock className="h-3 w-3" />
            End-to-end encrypted
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col wa-chat-bg">
      {/* Chat Header */}
      <div className="px-2 md:px-4 py-2.5 bg-[#008069] flex items-center shadow-sm">
        {/* Back button for mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => selectChat(null)}
          className="md:hidden text-white hover:text-white/80 hover:bg-white/10 rounded-full mr-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10 mr-3">
          <AvatarFallback className="bg-[#00a884] text-white font-medium">
            {getChatInitials()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{getChatName()}</h3>
          {isOtherTyping ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-green-200">typing</span>
              <div className="typing-dots"><span></span><span></span><span></span></div>
            </div>
          ) : (
            <p className="text-xs text-green-200">online</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearchBar(!showSearchBar)}
            title="Search"
            className="text-white/90 hover:text-white hover:bg-white/10 rounded-full"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleVoiceCall}
            disabled={callState !== 'idle'}
            title="Voice Call"
            className="text-white/90 hover:text-white hover:bg-white/10 rounded-full"
          >
            <Phone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleVideoCall}
            disabled={callState !== 'idle'}
            title="Video Call"
            className="text-white/90 hover:text-white hover:bg-white/10 rounded-full"
          >
            <Video className="h-5 w-5" />
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="text-white/90 hover:text-white hover:bg-white/10 rounded-full"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
            {showChatMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowChatMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl py-1 min-w-[200px] z-50 context-menu-enter">
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowDisappearingDialog(true); }}>
                    <Timer className="h-4 w-4" /> Disappearing messages
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={async () => { setShowChatMenu(false); if (activeChat) { try { await api.toggleChatLock(activeChat.id); } catch { showError('Failed to toggle chat lock'); } } }}>
                    <Lock className="h-4 w-4" /> {activeChat?.isLocked ? 'Unlock chat' : 'Lock chat'}
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={async () => { setShowChatMenu(false); setShowStarredMessages(true); try { const msgs = await api.getStarredMessages(); setStarredMessages(msgs); } catch { showError('Failed to load starred messages'); } }}>
                    <Star className="h-4 w-4" /> Starred messages
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowWallpaperDialog(true); }}>
                    <Image className="h-4 w-4" /> Chat wallpaper
                  </button>
                  {activeChat?.pinnedMessageId ? (
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={async () => { setShowChatMenu(false); if (activeChat) { try { await api.pinMessage(activeChat.id, null); } catch { showError('Failed to unpin message'); } } }}>
                      <Pin className="h-4 w-4" /> Unpin message
                    </button>
                  ) : null}
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowBackupDialog(true); }}>
                    <FileDown className="h-4 w-4" /> Chat backup
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowChatbotDialog(true); if (activeChat) { api.getChatbot(activeChat.id).then(config => { setChatbotEnabled(config.enabled); if (config.rules.length > 0) setChatbotRules(config.rules); }).catch(() => {}); } }}>
                    <Bot className="h-4 w-4" /> Chatbot auto-reply
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowOrderDialog(true); }}>
                    <ShoppingCart className="h-4 w-4" /> Create order
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
          <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className={`${i % 2 === 0 ? 'bg-[#d9fdd3]' : 'bg-white'} rounded-lg p-3 max-w-[60%] shadow-sm`}>
                  <div className="skeleton h-3 w-32 mb-2" />
                  <div className="skeleton h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="encryption-banner inline-flex items-center gap-2 mb-4">
                  <Lock className="h-3 w-3" />
                  Messages are end-to-end encrypted. No one outside of this chat can read them.
                </div>
                <p className="text-gray-500 text-sm">Send a message to start chatting</p>
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
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group msg-enter`}
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
                        <div className="border-l-4 border-[#00a884] bg-black/5 rounded px-2 py-1 mb-1 text-xs">
                          <p className="font-medium text-[#008069] truncate">
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
                className="h-full bg-[#00a884] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-sm text-gray-500">{uploadProgress}%</span>
          </div>
        </div>
      )}

      {/* Recording UI */}
      {recordingState === 'recording' && (
        <div className="px-4 py-3 bg-white border-t flex items-center gap-4 fade-in">
          {isVideoNote && (
            <div className="w-16 h-16 rounded-full overflow-hidden bg-black shadow-lg">
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
            <div className="w-3 h-3 bg-red-500 rounded-full recording-pulse" />
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
            className="bg-[#00a884] hover:bg-[#008069] rounded-full"
            size="icon"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-white border-t flex items-center gap-3">
          <div className="border-l-4 border-[#00a884] pl-2 flex-1 min-w-0">
            <p className="text-xs font-medium text-[#008069]">
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
                className="text-gray-500 hover:text-[#00a884] hover:bg-[#00a884]/10 rounded-full transition-colors"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              
              {showAttachMenu && (
                <div className="absolute bottom-12 left-0 bg-white rounded-xl shadow-xl p-2 flex flex-col gap-1 min-w-[170px] z-10 attach-menu-enter">
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
                    <div className="w-8 h-8 bg-[#00a884] rounded-full flex items-center justify-center">
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
                  <button
                    onClick={() => { setShowAttachMenu(false); setShowGifPicker(true); setIsLoadingGifs(true); api.getTrendingGifs().then(r => { setGifResults(r); setIsLoadingGifs(false); }).catch(() => setIsLoadingGifs(false)); }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                      <Smile className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">GIF</span>
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

            {/* View Once Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewOnceMode(!viewOnceMode)}
              className={`rounded-full transition-colors ${viewOnceMode ? 'text-[#00a884] bg-[#00a884]/10' : 'text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10'}`}
              title={viewOnceMode ? 'View once: ON' : 'View once: OFF'}
            >
              {viewOnceMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </Button>

            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                placeholder={viewOnceMode ? 'View once mode - media will disappear after viewing' : 'Type a message'}
                className="w-full px-4 py-2.5 bg-white rounded-3xl border-0 focus:ring-2 focus:ring-[#00a884]/20 resize-none text-sm"
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
                className="send-btn bg-[#00a884] hover:bg-[#008069] rounded-full h-10 w-10 shadow-sm"
                size="icon"
              >
                <Send className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                onClick={startAudioRecording}
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-[#00a884] hover:bg-[#00a884]/10 rounded-full h-10 w-10"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[60vh] flex flex-col dialog-content">
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
                      <AvatarFallback className="bg-[#00a884] text-white text-xs">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
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
                      try { await api.setDisappearingMessages(activeChat.id, opt.value); } catch { showError('Failed to set disappearing messages'); }
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Chat Wallpaper</h3>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {['default', '#d9fdd3', '#fde4cf', '#cff4fc', '#f0d9ff', '#ffe4e1', '#e8f5e9', '#fff3e0', '#e3f2fd', '#fce4ec', '#f3e5f5', '#e0f7fa'].map(color => (
                <button
                  key={color}
                  className="w-full aspect-square rounded-lg border-2 border-gray-200 hover:border-[#00a884]"
                  style={{ backgroundColor: color === 'default' ? '#efeae2' : color }}
                  onClick={async () => {
                    if (activeChat) {
                      try { await api.setChatWallpaper(activeChat.id, color === 'default' ? null : color); } catch { showError('Failed to set wallpaper'); }
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
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
              <button className="text-sm text-[#00a884] hover:text-[#008069] mb-3" onClick={() => setPollOptions([...pollOptions, ''])}>
                + Add option
              </button>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => { setShowPollCreator(false); setPollQuestion(''); setPollOptions(['', '']); }}>Cancel</Button>
              <Button
                className="bg-[#00a884] hover:bg-[#008069]"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Share Location</h3>
            <p className="text-sm text-gray-500 mb-4">Share your current location or enter coordinates manually.</p>
            <Button
              className="w-full bg-[#00a884] hover:bg-[#008069] mb-3"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
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

      {/* GIF Picker Dialog */}
      {showGifPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-lg max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Choose a GIF</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowGifPicker(false); setGifSearchQuery(''); setGifResults([]); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search GIFs..."
                className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#00a884]/20"
                value={gifSearchQuery}
                onChange={(e) => {
                  setGifSearchQuery(e.target.value);
                  if (e.target.value.trim()) {
                    setIsLoadingGifs(true);
                    api.searchGifs(e.target.value).then(r => { setGifResults(r); setIsLoadingGifs(false); }).catch(() => setIsLoadingGifs(false));
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoadingGifs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-pulse text-gray-500">Loading GIFs...</div>
                </div>
              ) : gifResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">No GIFs found. Try a different search.</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {gifResults.map(gif => (
                    <button
                      key={gif.id}
                      className="aspect-square overflow-hidden rounded-lg hover:opacity-80 transition-opacity"
                      onClick={() => {
                        const gifUrl = gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url || '';
                        if (activeChat && gifUrl) {
                          api.sendMediaMessage(activeChat.id, {
                            content: gif.title || 'GIF',
                            type: 'image',
                            mediaUrl: gifUrl,
                            mediaType: 'image/gif',
                            mediaName: `${gif.title || 'gif'}.gif`,
                            mediaSize: 0,
                            tempId: `temp-${Date.now()}`,
                          }).catch(() => {});
                        }
                        setShowGifPicker(false);
                        setGifSearchQuery('');
                        setGifResults([]);
                      }}
                    >
                      <img
                        src={gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url}
                        alt={gif.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">Powered by Tenor</p>
          </div>
        </div>
      )}

      {/* Chat Backup Dialog */}
      {showBackupDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Chat Backup</h3>
            <p className="text-sm text-gray-500 mb-4">Download a backup of this chat conversation.</p>
            <div className="space-y-2">
              <Button
                className="w-full bg-[#00a884] hover:bg-[#008069]"
                onClick={async () => {
                  if (activeChat) {
                    try {
                      const data = await api.backupChat(activeChat.id, 'text');
                      const blob = new Blob([data.content], { type: data.mimeType });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = data.filename;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch { showError('Failed to export chat as text'); }
                  }
                  setShowBackupDialog(false);
                }}
              >
                <FileDown className="h-4 w-4 mr-2" /> Download as Text
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  if (activeChat) {
                    try {
                      const data = await api.backupChat(activeChat.id, 'json');
                      const blob = new Blob([data.content], { type: data.mimeType });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = data.filename;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch { showError('Failed to export chat as JSON'); }
                  }
                  setShowBackupDialog(false);
                }}
              >
                <Download className="h-4 w-4 mr-2" /> Download as JSON
              </Button>
            </div>
            <div className="flex justify-end mt-3">
              <Button variant="outline" onClick={() => setShowBackupDialog(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Auto-Reply Dialog */}
      {showChatbotDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[70vh] flex flex-col">
            <h3 className="font-semibold mb-3">Chatbot Auto-Reply</h3>
            <p className="text-sm text-gray-500 mb-4">Set up automatic replies based on trigger keywords.</p>
            <div className="flex items-center gap-2 mb-4">
              <label className="text-sm font-medium">Enable chatbot:</label>
              <button
                className={`w-10 h-6 rounded-full transition-colors ${chatbotEnabled ? 'bg-[#00a884]' : 'bg-gray-300'}`}
                onClick={() => setChatbotEnabled(!chatbotEnabled)}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${chatbotEnabled ? 'translate-x-4' : ''}`} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {chatbotRules.map((rule, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <input
                    type="text"
                    placeholder="Trigger keyword (e.g. hello, help, price)"
                    className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
                    value={rule.trigger}
                    onChange={(e) => { const rules = [...chatbotRules]; rules[i] = { ...rules[i], trigger: e.target.value }; setChatbotRules(rules); }}
                  />
                  <input
                    type="text"
                    placeholder="Auto-reply message"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    value={rule.response}
                    onChange={(e) => { const rules = [...chatbotRules]; rules[i] = { ...rules[i], response: e.target.value }; setChatbotRules(rules); }}
                  />
                  {chatbotRules.length > 1 && (
                    <button className="text-xs text-red-500 mt-1" onClick={() => setChatbotRules(chatbotRules.filter((_, j) => j !== i))}>Remove</button>
                  )}
                </div>
              ))}
              <button className="text-sm text-[#00a884] hover:text-[#008069]" onClick={() => setChatbotRules([...chatbotRules, { trigger: '', response: '' }])}>
                + Add rule
              </button>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => setShowChatbotDialog(false)}>Cancel</Button>
              <Button
                className="bg-[#00a884] hover:bg-[#008069]"
                onClick={async () => {
                  if (activeChat) {
                    const validRules = chatbotRules.filter(r => r.trigger.trim() && r.response.trim());
                    try {
                      await api.configureChatbot(activeChat.id, { enabled: chatbotEnabled, rules: validRules });
                    } catch { showError('Failed to save chatbot configuration'); }
                  }
                  setShowChatbotDialog(false);
                }}
              >Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Order Dialog */}
      {showOrderDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 dialog-overlay">
          <div className="bg-white rounded-lg p-4 w-full max-w-md max-h-[70vh] flex flex-col">
            <h3 className="font-semibold mb-3">Create Order</h3>
            <p className="text-sm text-gray-500 mb-4">Add items to create an order in this chat.</p>
            <div className="flex-1 overflow-y-auto space-y-3">
              {orderItems.map((item, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Product name"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    value={item.name}
                    onChange={(e) => { const items = [...orderItems]; items[i] = { ...items[i], name: e.target.value, productId: `prod-${i}` }; setOrderItems(items); }}
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Price"
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      value={item.price || ''}
                      onChange={(e) => { const items = [...orderItems]; items[i] = { ...items[i], price: parseFloat(e.target.value) || 0 }; setOrderItems(items); }}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      className="w-20 px-3 py-2 border rounded-lg text-sm"
                      value={item.quantity}
                      onChange={(e) => { const items = [...orderItems]; items[i] = { ...items[i], quantity: parseInt(e.target.value) || 1 }; setOrderItems(items); }}
                    />
                  </div>
                  {orderItems.length > 1 && (
                    <button className="text-xs text-red-500" onClick={() => setOrderItems(orderItems.filter((_, j) => j !== i))}>Remove</button>
                  )}
                </div>
              ))}
              <button className="text-sm text-[#00a884] hover:text-[#008069]" onClick={() => setOrderItems([...orderItems, { productId: '', name: '', price: 0, quantity: 1 }])}>
                + Add item
              </button>
              <div className="border-t pt-2">
                <p className="text-sm font-medium">Total: ${orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => { setShowOrderDialog(false); setOrderItems([{ productId: '', name: '', price: 0, quantity: 1 }]); }}>Cancel</Button>
              <Button
                className="bg-[#00a884] hover:bg-[#008069]"
                disabled={!orderItems.some(item => item.name.trim() && item.price > 0)}
                onClick={async () => {
                  if (activeChat) {
                    const validItems = orderItems.filter(item => item.name.trim() && item.price > 0).map((item, i) => ({ ...item, productId: `prod-${i}` }));
                    try {
                      await api.createOrder(activeChat.id, validItems);
                    } catch { showError('Failed to create order'); }
                  }
                  setShowOrderDialog(false);
                  setOrderItems([{ productId: '', name: '', price: 0, quantity: 1 }]);
                }}
              >Create Order</Button>
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
          <BarChart3 className="h-4 w-4 text-[#00a884]" />
          <span className="font-medium text-sm">{poll.question}</span>
        </div>
        {poll.options?.map((opt: { text: string; votes: number }, i: number) => (
          <div key={i} className="mb-1">
            <div className="flex justify-between text-xs text-gray-600 mb-0.5">
              <span>{opt.text}</span>
              <span>{opt.votes || 0}</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full">
              <div className="h-full bg-[#00a884] rounded-full" style={{ width: `${Math.min(100, (opt.votes || 0) * 20)}%` }} />
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
