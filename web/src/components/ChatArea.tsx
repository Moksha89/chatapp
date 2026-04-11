import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useCall } from '../context/CallContext';
import { useToast } from './Toast';
import { socketService } from '../services/socket';
import { api } from '../services/api';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { MessageContextMenu, MessageReactions } from './MessageContextMenu';
import { ChatDialogs } from './chat';
import {
  renderPollContent,
  renderLocationContent,
  renderContactCardContent,
  formatMessageTime as fmtMsgTime,
  formatRecordingTime as fmtRecTime,
  formatFileSize as fmtFileSize,
  formatDateSeparator as fmtDateSep,
  shouldShowDateSeparator as showDateSep,
} from './MessageContentRenderers';
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
  Timer,
  Lock,
  Eye,
  EyeOff,
  Bot,
  ShoppingCart,
  FileDown,
  Smile,
  Users,
  ChevronDown,
  ChevronUp,
  BellOff,
  Hash,
  Globe,
  BarChart3,
  MapPin,
  User as UserIcon,
  AlertCircle,
  WifiOff,
  CalendarClock,
  Link2,
  Sticker
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
  const { activeChat, messages, isLoadingMessages, sendMessage, typingUsers, onlineUsers, selectChat, addReaction, removeReaction, editMessage, deleteMessage, toggleStar, forwardMessage, replyingTo, setReplyingTo, chats, refreshChats, loadMoreMessages } = useChat();
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMediaLightbox, setShowMediaLightbox] = useState<string | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [contactPickerUsers, setContactPickerUsers] = useState<Array<{ id: string; displayName: string; phoneNumber: string }>>([]);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<Array<{ id: string; chatId: string; content: string; createdAt: string }>>([]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [mutedChats, setMutedChats] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('mutedChats');
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [availableUsersForAdd, setAvailableUsersForAdd] = useState<Array<{ id: string; displayName: string; phoneNumber: string }>>([]);
  const [quickReplySuggestions, setQuickReplySuggestions] = useState<Array<{ id: string; shortcode: string; message: string }>>([]);
  const [showQuickReplySuggestions, setShowQuickReplySuggestions] = useState(false);
  // Message scheduling
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  // Search navigation
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  // Link preview detection
  const [linkPreviews, setLinkPreviews] = useState<Map<string, { title: string; description: string; image?: string; url: string }>>(new Map());
  // Connection status: 'online' | 'offline' | 'reconnecting'
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'reconnecting'>(navigator.onLine ? 'online' : 'offline');
  // Image quality/compression
  const [imageQuality, setImageQuality] = useState(85);
  // Camera capture
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  // Sticker picker
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  // Multi-message selection
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  // Seen-by dialog for group messages
  const [showSeenByDialog, setShowSeenByDialog] = useState<string | null>(null);

  // Fix #2: Persist mute notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mutedChats', JSON.stringify(Array.from(mutedChats)));
    } catch { /* ignore storage errors */ }
  }, [mutedChats]);

  // Draft persistence: load draft when switching chats
  useEffect(() => {
    if (!activeChat) return;
    try {
      const drafts = JSON.parse(localStorage.getItem('messageDrafts') || '{}');
      const draft = drafts[activeChat.id];
      if (draft) setInputValue(draft);
      else setInputValue('');
    } catch { setInputValue(''); }
  }, [activeChat?.id]);

  // Draft persistence: save draft on input change
  useEffect(() => {
    if (!activeChat) return;
    try {
      const drafts = JSON.parse(localStorage.getItem('messageDrafts') || '{}');
      if (inputValue.trim()) drafts[activeChat.id] = inputValue;
      else delete drafts[activeChat.id];
      localStorage.setItem('messageDrafts', JSON.stringify(drafts));
    } catch { /* ignore */ }
  }, [inputValue, activeChat?.id]);

  // Connection status detection (offline + socket reconnecting)
  useEffect(() => {
    const goOffline = () => { setConnectionStatus('offline'); };
    const goOnline = () => { setConnectionStatus(socketService.isConnected() ? 'online' : 'reconnecting'); };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    // Socket connection status polling
    const checkSocket = setInterval(() => {
      if (!navigator.onLine) {
        setConnectionStatus('offline');
      } else if (!socketService.isConnected()) {
        setConnectionStatus('reconnecting');
      } else {
        setConnectionStatus('online');
      }
    }, 3000);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      clearInterval(checkSocket);
    };
  }, []);

  // Search match count tracking
  useEffect(() => {
    if (chatSearchQuery) {
      const count = messages.filter(m => m.content?.toLowerCase().includes(chatSearchQuery.toLowerCase())).length;
      setSearchMatchCount(count);
      setSearchMatchIndex(count > 0 ? 1 : 0);
    } else {
      setSearchMatchCount(0);
      setSearchMatchIndex(0);
    }
  }, [chatSearchQuery, messages]);

  // Link preview detection for URLs in messages
  useEffect(() => {
    const urlRegex = /https?:\/\/[^\s]+/g;
    messages.forEach(msg => {
      if (msg.content && !msg.isDeleted) {
        const urls = msg.content.match(urlRegex);
        if (urls && urls.length > 0) {
          setLinkPreviews(prev => {
            if (prev.has(msg.id)) return prev;
            const next = new Map(prev);
            try {
              next.set(msg.id, { title: new URL(urls[0]).hostname, description: urls[0], url: urls[0] });
            } catch {
              next.set(msg.id, { title: urls[0], description: urls[0], url: urls[0] });
            }
            return next;
          });
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Keyboard shortcuts: Ctrl+F for search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && activeChat) {
        e.preventDefault();
        setShowSearchBar(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeChat]);

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
    // ScrollArea uses an internal viewport div - find it for proper scrolling
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
      const scrollTarget = viewport || scrollRef.current;
      scrollTarget.scrollTop = scrollTarget.scrollHeight;
      setShowScrollToBottom(false);
    }
  }, [messages]);

  const handleMessagesScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollToBottom(distanceFromBottom > 200);
  }, []);

  // Attach scroll listener to the actual Radix viewport element (scroll-to-bottom + infinite scroll)
  useEffect(() => {
    if (!scrollRef.current) return;
    const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    if (!viewport) return;
    const onScroll = () => {
      const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      setShowScrollToBottom(distanceFromBottom > 200);
      // Infinite scroll: load more messages when near top
      if (viewport.scrollTop < 100) {
        loadMoreMessages();
      }
    };
    viewport.addEventListener('scroll', onScroll);
    return () => viewport.removeEventListener('scroll', onScroll);
  }, [activeChat, loadMoreMessages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
      const scrollTarget = viewport || scrollRef.current;
      scrollTarget.scrollTop = scrollTarget.scrollHeight;
      setShowScrollToBottom(false);
    }
  };

  const getSenderName = (senderId: string): string => {
    if (senderId === user?.id) return 'You';
    const participant = activeChat?.participants.find(p => p.userId === senderId);
    return participant?.user?.displayName || participant?.user?.phoneNumber || 'Unknown';
  };

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
    const val = e.target.value;
    setInputValue(val);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';

    // Quick reply suggestions: trigger when typing /
    if (val.startsWith('/') && val.length >= 1) {
      api.getQuickReplies().then((replies: Array<{ id: string; shortcode: string; message: string }>) => {
        const prefix = val.toLowerCase();
        const filtered = replies.filter((r: { shortcode: string }) => r.shortcode.toLowerCase().startsWith(prefix));
        setQuickReplySuggestions(filtered);
        setShowQuickReplySuggestions(filtered.length > 0);
      }).catch(() => { setShowQuickReplySuggestions(false); });
    } else {
      setShowQuickReplySuggestions(false);
    }

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

    // Clear draft after sending
    try {
      const drafts = JSON.parse(localStorage.getItem('messageDrafts') || '{}');
      delete drafts[activeChat.id];
      localStorage.setItem('messageDrafts', JSON.stringify(drafts));
    } catch { /* ignore */ }

    // Bug #7 fix: Reset textarea height after sending multiline message
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) textarea.style.height = 'auto';

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
    // ArrowUp to edit last own message when input is empty
    if (e.key === 'ArrowUp' && !inputValue.trim()) {
      const lastOwnMsg = [...messages].reverse().find(m => m.senderId === user?.id && !m.isDeleted);
      if (lastOwnMsg) {
        const age = Date.now() - new Date(lastOwnMsg.createdAt).getTime();
        if (age < 15 * 60 * 1000) {
          e.preventDefault();
          setEditingMessage({ id: lastOwnMsg.id, content: lastOwnMsg.content || '' });
        }
      }
    }
  };

  const uploadAndSendMedia = useCallback(async (file: File, type: MediaMessage['type']) => {
    if (!activeChat) return;

    // File size limits (in bytes)
    const MAX_FILE_SIZES: Record<string, number> = {
      image: 16 * 1024 * 1024,    // 16MB for images
      video: 64 * 1024 * 1024,    // 64MB for videos
      audio: 16 * 1024 * 1024,    // 16MB for audio
      'video-note': 16 * 1024 * 1024, // 16MB for video notes
      file: 100 * 1024 * 1024,    // 100MB for files
    };

    // File type validation (allowed MIME types)
    const ALLOWED_TYPES: Record<string, string[]> = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/mp4'],
      'video-note': ['video/mp4', 'video/webm'],
      file: [], // Allow all types for generic files
    };

    const maxSize = MAX_FILE_SIZES[type] || MAX_FILE_SIZES.file;
    if (file.size > maxSize) {
      showError('File too large', `Maximum size for ${type} is ${Math.round(maxSize / (1024 * 1024))}MB`);
      return;
    }

    const allowedTypes = ALLOWED_TYPES[type];
    if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      showError('Invalid file type', `${file.type || 'Unknown type'} is not allowed for ${type}`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Real upload progress using XHR
      const result = await api.uploadMedia(file, (progress: number) => {
        setUploadProgress(Math.round(progress * 90)); // 0-90% for upload
      });
      
      setUploadProgress(95);

      await api.sendMediaMessage(activeChat.id, {
        content: file.name,
        type,
        mediaUrl: result.url,
        mediaType: result.mimeType,
        mediaName: result.filename,
        mediaSize: result.size,
        tempId: `temp-${Date.now()}`,
      });

      setUploadProgress(100);
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
    const files = e.target.files;
    if (files && files.length > 0) {
      // Support multiple image sharing (batch select)
      Array.from(files).forEach(file => {
        uploadAndSendMedia(file, type);
      });
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
    console.log('[Call] handleVoiceCall:', { targetUserId, callState, activeChat: activeChat?.id, participants: activeChat?.participants?.length });
    if (!targetUserId) {
      console.warn('[Call] No target user found for voice call');
      return;
    }
    if (callState !== 'idle') {
      console.warn('[Call] Call state is not idle:', callState);
      return;
    }
    if (!activeChat) {
      console.warn('[Call] No active chat');
      return;
    }
    initiateCall(targetUserId, getChatName(), 'audio', activeChat.id);
  };

  const handleVideoCall = () => {
    const targetUserId = getOtherParticipantId();
    console.log('[Call] handleVideoCall:', { targetUserId, callState, activeChat: activeChat?.id, participants: activeChat?.participants?.length });
    if (!targetUserId) {
      console.warn('[Call] No target user found for video call');
      return;
    }
    if (callState !== 'idle') {
      console.warn('[Call] Call state is not idle:', callState);
      return;
    }
    if (!activeChat) {
      console.warn('[Call] No active chat');
      return;
    }
    initiateCall(targetUserId, getChatName(), 'video', activeChat.id);
  };

  const formatMessageTime = fmtMsgTime;
  const formatRecordingTime = fmtRecTime;
  const formatFileSize = fmtFileSize;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-gray-400 animate-pulse" />;
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500 transition-colors duration-300" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'queued':
        return <WifiOff className="h-3 w-3 text-orange-400" />;
      default:
        return null;
    }
  };

  // Scroll to a specific message by ID
  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-yellow-100/50');
      setTimeout(() => el.classList.remove('bg-yellow-100/50'), 2000);
    }
  };

  // Handle scheduling a message
  const handleScheduleMessage = () => {
    if (!inputValue.trim() || !activeChat || !scheduleDate || !scheduleTime) return;
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    socketService.emit('message:send', {
      chatId: activeChat.id,
      content: inputValue.trim(),
      type: 'text',
      tempId: `temp-${Date.now()}`,
      scheduledAt,
    });
    setInputValue('');
    setShowScheduleDialog(false);
    setScheduleDate('');
    setScheduleTime('');
  };

  const formatDateSeparator = fmtDateSep;
  const shouldShowDateSeparator = showDateSep;

  // Image compression before upload
  const compressImage = useCallback(async (file: File, quality: number): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        // Max dimension 2048px (WhatsApp-style)
        const maxDim = 2048;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality / 100);
      };
      img.src = objectUrl;
    });
  }, []);

  // Video compression using Canvas + MediaRecorder re-encoding
  const compressVideo = useCallback(async (file: File): Promise<File> => {
    // Only compress if > 10MB
    if (file.size < 10 * 1024 * 1024) return file;

    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;

      video.onloadedmetadata = () => {
        // Scale down to max 720p
        let { videoWidth: w, videoHeight: h } = video;
        const maxDim = 720;
        if (h > maxDim) {
          const ratio = maxDim / h;
          w = Math.round(w * ratio);
          h = maxDim;
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        const stream = canvas.captureStream(24); // 24fps
        // Try to get audio from video
        try {
          const audioCtx = new AudioContext();
          const source = audioCtx.createMediaElementSource(video);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioCtx.destination);
          dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
        } catch { /* no audio track or not supported */ }

        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm',
          videoBitsPerSecond: 1_500_000, // 1.5 Mbps
        });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          URL.revokeObjectURL(objectUrl);
          const blob = new Blob(chunks, { type: 'video/webm' });
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.webm'), { type: 'video/webm' });
          resolve(compressed.size < file.size ? compressed : file);
        };

        video.onended = () => { recorder.stop(); };
        recorder.start();
        video.play();

        const drawFrame = () => {
          if (video.ended || video.paused) return;
          ctx?.drawImage(video, 0, 0, w, h);
          requestAnimationFrame(drawFrame);
        };
        drawFrame();

        // Safety timeout: stop after 5 minutes max
        setTimeout(() => { if (recorder.state === 'recording') { video.pause(); recorder.stop(); } }, 5 * 60 * 1000);
      };

      video.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    });
  }, []);

  // Enhanced upload with compression option
  const handleImageUpload = useCallback(async (file: File) => {
    const quality = imageQuality;
    if (quality < 100 && file.type.startsWith('image/')) {
      const compressed = await compressImage(file, quality);
      uploadAndSendMedia(compressed, 'image');
    } else {
      uploadAndSendMedia(file, 'image');
    }
  }, [imageQuality, compressImage, uploadAndSendMedia]);

  // Video upload with compression
  const handleVideoUpload = useCallback(async (file: File) => {
    const compressed = await compressVideo(file);
    uploadAndSendMedia(compressed, 'video');
  }, [compressVideo, uploadAndSendMedia]);

  // Camera capture handler
  const handleCameraCapture = useCallback(async (mode: 'photo' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 1280, height: 720 }, 
        audio: mode === 'video' 
      });
      setCameraStream(stream);
      setShowCameraCapture(true);
      setCameraMode(mode);
    } catch {
      showError('Camera access denied', 'Please allow camera permissions');
    }
  }, [showError]);

  const capturePhoto = useCallback(() => {
    if (!cameraStream) return;
    const video = document.getElementById('camera-preview') as HTMLVideoElement;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
        setShowCameraCapture(false);
        handleImageUpload(file);
      }
    }, 'image/jpeg', 0.92);
  }, [cameraStream, handleImageUpload]);

  const renderMediaContent = (message: {
    id?: string;
    type: string;
    content?: string;
    mediaUrl?: string;
    mediaType?: string;
    mediaName?: string;
    mediaSize?: number;
    mediaDuration?: number;
    isViewOnce?: boolean;
  }, isOwn = false) => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const mediaUrl = message.mediaUrl ? `${baseUrl}${message.mediaUrl}` : '';

    switch (message.type) {
      case 'image':
        return (
          <div className="max-w-xs relative group">
            {message.isViewOnce ? (
              <div className="w-48 h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:from-gray-300 hover:to-gray-400 transition-all" onClick={() => setShowMediaLightbox(mediaUrl)}>
                <Eye className="h-8 w-8 text-gray-500 mb-2" />
                <span className="text-xs text-gray-600 font-medium">View once photo</span>
                <span className="text-[10px] text-gray-400 mt-1">Tap to open</span>
              </div>
            ) : (
              <>
                <img 
                  src={mediaUrl} 
                  alt={message.mediaName || 'Image'} 
                  className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setShowMediaLightbox(mediaUrl)}
                  loading="lazy"
                />
                {/* Image overlay actions */}
                <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={mediaUrl} download={message.mediaName} className="bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70" onClick={e => e.stopPropagation()}>
                    <Download className="h-3 w-3" />
                  </a>
                </div>
                {/* File size badge */}
                {message.mediaSize && (
                  <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">{formatFileSize(message.mediaSize)}</span>
                )}
              </>
            )}
          </div>
        );
      case 'video':
      case 'video-note':
        return (
          <div className={`relative group ${message.type === 'video-note' ? 'w-48 h-48 rounded-full overflow-hidden' : 'max-w-xs'}`}>
            {message.isViewOnce ? (
              <div className="w-48 h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:from-gray-300 hover:to-gray-400 transition-all">
                <Video className="h-8 w-8 text-gray-500 mb-2" />
                <span className="text-xs text-gray-600 font-medium">View once video</span>
                <span className="text-[10px] text-gray-400 mt-1">Tap to open</span>
              </div>
            ) : (
              <>
                <video 
                  src={mediaUrl} 
                  controls 
                  preload="metadata"
                  className={message.type === 'video-note' ? 'w-full h-full object-cover' : 'rounded-lg max-w-full'}
                />
                {/* Duration & size overlay */}
                {(message.mediaDuration || message.mediaSize) && message.type !== 'video-note' && (
                  <div className="absolute bottom-8 left-2 flex gap-2">
                    {message.mediaDuration && <span className="bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">{Math.floor(message.mediaDuration / 60)}:{String(Math.floor(message.mediaDuration % 60)).padStart(2, '0')}</span>}
                    {message.mediaSize && <span className="bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">{formatFileSize(message.mediaSize)}</span>}
                  </div>
                )}
              </>
            )}
          </div>
        );
      case 'audio': {
        const AudioPlayer = () => {
          const [playbackRate, setPlaybackRate] = useState(1);
          const [isPlaying, setIsPlaying] = useState(false);
          const [progress, setProgress] = useState(0);
          const [duration, setDuration] = useState(message.mediaDuration || 0);
          const audioRef = useRef<HTMLAudioElement>(null);
          const rates = [1, 1.5, 2];
          const cycleRate = () => {
            const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
            const newRate = rates[nextIdx];
            setPlaybackRate(newRate);
            if (audioRef.current) audioRef.current.playbackRate = newRate;
          };
          const togglePlay = () => {
            if (!audioRef.current) return;
            if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
          };
          // Generate static waveform bars (deterministic from message id)
          const msgId = message.id || '';
          const waveformBars = useMemo(() => {
            const bars: number[] = [];
            let seed = 0;
            for (let i = 0; i < msgId.length; i++) seed += msgId.charCodeAt(i);
            for (let i = 0; i < 32; i++) {
              seed = (seed * 16807 + 12345) % 2147483647;
              bars.push(0.2 + (seed % 100) / 125);
            }
            return bars;
          }, [msgId]);
          const formatDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
          return (
            <div className="flex items-center gap-2 min-w-[220px] rounded-xl px-3 py-2">
              <audio
                ref={audioRef}
                src={mediaUrl}
                preload="metadata"
                onLoadedMetadata={() => { if (audioRef.current && audioRef.current.duration !== Infinity) setDuration(audioRef.current.duration); }}
                onTimeUpdate={() => { if (audioRef.current && duration > 0) setProgress(audioRef.current.currentTime / duration); }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => { setIsPlaying(false); setProgress(0); }}
                className="hidden"
              />
              <button onClick={togglePlay} className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isOwn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-[#246BFD]/10 hover:bg-[#246BFD]/20 text-[#246BFD]'}`}>
                {isPlaying ? (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                ) : (
                  <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-end gap-[2px] h-6 cursor-pointer" onClick={(e) => {
                  if (!audioRef.current || !duration) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  audioRef.current.currentTime = pct * duration;
                  setProgress(pct);
                }}>
                  {waveformBars.map((h, i) => (
                    <div
                      key={i}
                      className={`w-[3px] rounded-full transition-colors ${i / waveformBars.length <= progress ? (isOwn ? 'bg-white' : 'bg-[#246BFD]') : (isOwn ? 'bg-white/30' : 'bg-gray-300')}`}
                      style={{ height: `${h * 100}%` }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>{formatDur(isPlaying ? progress * duration : duration)}</span>
                  <button onClick={cycleRate} className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 transition-colors ${isOwn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'}`}>
                    {playbackRate}x
                  </button>
                </div>
              </div>
            </div>
          );
        };
        return <AudioPlayer />;
      }
      case 'sticker':
        return (
          <div className="w-32 h-32">
            <img src={mediaUrl} alt="Sticker" className="w-full h-full object-contain" />
          </div>
        );
      case 'gif':
        return (
          <div className="max-w-xs">
            <img src={mediaUrl || message.content} alt="GIF" className="rounded-lg max-w-full h-auto" loading="lazy" />
          </div>
        );
      case 'file': {
        const ext = (message.mediaName || '').split('.').pop()?.toLowerCase() || '';
        const getFileIcon = () => {
          if (['pdf'].includes(ext)) return <FileText className="h-8 w-8 text-red-500" />;
          if (['doc','docx'].includes(ext)) return <FileText className="h-8 w-8 text-blue-600" />;
          if (['xls','xlsx','csv'].includes(ext)) return <FileText className="h-8 w-8 text-green-600" />;
          if (['ppt','pptx'].includes(ext)) return <FileText className="h-8 w-8 text-orange-500" />;
          if (['zip','rar','7z','tar','gz'].includes(ext)) return <FileDown className="h-8 w-8 text-yellow-600" />;
          return <FileText className="h-8 w-8 text-gray-500" />;
        };
        return (
          <a 
            href={mediaUrl} 
            download={message.mediaName}
            className="flex items-center gap-3 p-3 bg-white/50 rounded-xl hover:bg-white/70 transition-colors min-w-[200px]"
          >
            {getFileIcon()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.mediaName}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-gray-400">{ext}</span>
                <span className="text-[10px] text-gray-400">{formatFileSize(message.mediaSize || 0)}</span>
              </div>
            </div>
            <Download className="h-5 w-5 text-gray-400 hover:text-[#246BFD] transition-colors" />
          </a>
        );
      }
      default:
        return <p className="text-sm break-words">{message.content}</p>;
    }
  };

  const chatTypingUsers = activeChat ? typingUsers.get(activeChat.id) : undefined;
  const isOtherTyping = chatTypingUsers && chatTypingUsers.size > 0;

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F8FC]">
        <div className="text-center max-w-md px-6 fade-in">
          <div className="abhi-gradient p-8 rounded-full inline-block mb-6 shadow-lg shadow-blue-500/20">
            <MessageCircle className="h-20 w-20 text-white" />
          </div>
          <h2 className="text-3xl font-light text-gray-700 mb-3">Abhi Chat</h2>
          <p className="text-gray-500 text-base mb-6">Send and receive messages without keeping your phone online.</p>
          <p className="text-gray-400 text-sm">Use on up to 4 linked devices and 1 phone at the same time.</p>
          <a
            href="/version/download/android"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#246BFD] to-[#6C5CE7] hover:from-[#1A56DB] hover:to-[#5A4BD1] text-white rounded-full text-sm font-medium shadow-md shadow-blue-500/20 transition-all"
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
    <div className={`flex-1 flex flex-col ${activeChat?.wallpaper ? '' : 'wa-chat-bg'} relative`} style={activeChat?.wallpaper ? { backgroundColor: activeChat.wallpaper } : undefined}>
      {/* Chat Header */}
      <div className="px-2 md:px-4 py-2.5 bg-white border-b border-gray-100 flex items-center shadow-sm">
        {/* Back button for mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => selectChat(null)}
          className="md:hidden text-gray-600 hover:text-[#246BFD] hover:bg-[#246BFD]/10 rounded-full mr-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="relative mr-3">
          <Avatar className="h-10 w-10">
            {(() => {
              const otherP = activeChat?.participants.find(p => p.userId !== user?.id);
              const photo = activeChat?.type === 'direct' ? (otherP?.user as { profilePhoto?: string } | undefined)?.profilePhoto : undefined;
              return photo ? <AvatarImage src={photo} alt={getChatName()} /> : null;
            })()}
            <AvatarFallback className="abhi-avatar text-white font-medium">
              {getChatInitials()}
            </AvatarFallback>
          </Avatar>
          {/* Green online indicator dot */}
          {activeChat?.type === 'direct' && (() => {
            const otherUserId = activeChat?.participants.find(p => p.userId !== user?.id)?.userId;
            return otherUserId && onlineUsers.has(otherUserId) ? (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#22C55E] border-2 border-white rounded-full" />
            ) : null;
          })()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {getChatName()}
            {activeChat?.disappearingMessagesDuration && <Timer className="h-3 w-3 inline ml-1 text-[#246BFD]" />}
            {activeChat?.isLocked && <Lock className="h-3 w-3 inline ml-1 text-[#246BFD]" />}
            {mutedChats.has(activeChat?.id || '') && <BellOff className="h-3 w-3 inline ml-1 text-gray-400" />}
          </h3>
          {isOtherTyping ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-[#246BFD]">
                {(activeChat?.type === 'group' || activeChat?.type === 'community') ? (() => {
                  const typingUserIds = Array.from(chatTypingUsers || []);
                  const names = typingUserIds.map(id => getSenderName(id)).filter(n => n !== 'You');
                  return names.length > 0 ? `${names.join(', ')} typing` : 'typing';
                })() : 'typing'}
              </span>
              <div className="typing-dots"><span></span><span></span><span></span></div>
            </div>
          ) : (() => {
            if (activeChat?.type === 'channel') {
              const count = activeChat.participants.length;
              const adminCount = activeChat.participants.filter((p: { role?: string }) => p.role === 'admin').length;
              return <p className="text-xs text-gray-400">{count} subscriber{count !== 1 ? 's' : ''} &middot; {adminCount} admin{adminCount !== 1 ? 's' : ''}</p>;
            }
            if (activeChat?.type === 'community') {
              const count = activeChat.participants.length;
              return <p className="text-xs text-gray-400">{count} member{count !== 1 ? 's' : ''} &middot; Community</p>;
            }
            if (activeChat?.type === 'group') {
              const count = activeChat.participants.length;
              const onlineCount = activeChat.participants.filter((p: { userId: string }) => onlineUsers.has(p.userId)).length;
              return <p className="text-xs text-gray-400">{count} participant{count !== 1 ? 's' : ''}{onlineCount > 0 ? ` \u00b7 ${onlineCount} online` : ''}</p>;
            }
            const otherUserId = activeChat?.participants.find(p => p.userId !== user?.id)?.userId;
            const isOnline = otherUserId ? onlineUsers.has(otherUserId) : false;
            return <p className={`text-xs ${isOnline ? 'text-[#22C55E] font-medium' : 'text-gray-400'}`}>{isOnline ? 'online' : 'last seen recently'}</p>;
          })()}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearchBar(!showSearchBar)}
            title="Search"
            className="text-gray-500 hover:text-[#246BFD] hover:bg-[#246BFD]/10 rounded-full"
          >
            <Search className="h-5 w-5" />
          </Button>
          {activeChat?.type !== 'channel' && activeChat?.type !== 'community' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleVoiceCall}
              disabled={callState !== 'idle'}
              title="Voice Call"
              className="text-gray-500 hover:text-[#246BFD] hover:bg-[#246BFD]/10 rounded-full"
            >
              <Phone className="h-5 w-5" />
            </Button>
          )}
          {activeChat?.type !== 'channel' && activeChat?.type !== 'community' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleVideoCall}
              disabled={callState !== 'idle'}
              title="Video Call"
              className="text-gray-500 hover:text-[#246BFD] hover:bg-[#246BFD]/10 rounded-full"
            >
              <Video className="h-5 w-5" />
            </Button>
          )}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="text-gray-500 hover:text-[#246BFD] hover:bg-[#246BFD]/10 rounded-full"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
            {showChatMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowChatMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl py-1.5 min-w-[200px] z-50 context-menu-enter border border-gray-100">
                  {/* Context-sensitive menu items based on chat type */}
                  {activeChat?.type === 'channel' ? (
                    <>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowChannelInfo(true); }}>
                        <Hash className="h-4 w-4" /> Channel info
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowGlobalSearch(true); }}>
                        <Search className="h-4 w-4" /> Search messages
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={async () => { setShowChatMenu(false); setShowStarredMessages(true); try { const msgs = await api.getStarredMessages(); setStarredMessages(msgs); } catch { showError('Failed to load starred messages'); } }}>
                        <Star className="h-4 w-4" /> Starred messages
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); if (activeChat) { setMutedChats(prev => { const next = new Set(prev); if (next.has(activeChat.id)) next.delete(activeChat.id); else next.add(activeChat.id); return next; }); } }}>
                        <BellOff className="h-4 w-4" /> {activeChat && mutedChats.has(activeChat.id) ? 'Unmute notifications' : 'Mute notifications'}
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowDisappearingDialog(true); }}>
                        <Timer className="h-4 w-4" /> Disappearing messages
                      </button>
                    </>
                  ) : activeChat?.type === 'community' ? (
                    <>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowChannelInfo(true); }}>
                        <Globe className="h-4 w-4" /> Community info
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowGlobalSearch(true); }}>
                        <Search className="h-4 w-4" /> Search messages
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={async () => { setShowChatMenu(false); setShowStarredMessages(true); try { const msgs = await api.getStarredMessages(); setStarredMessages(msgs); } catch { showError('Failed to load starred messages'); } }}>
                        <Star className="h-4 w-4" /> Starred messages
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); if (activeChat) { setMutedChats(prev => { const next = new Set(prev); if (next.has(activeChat.id)) next.delete(activeChat.id); else next.add(activeChat.id); return next; }); } }}>
                        <BellOff className="h-4 w-4" /> {activeChat && mutedChats.has(activeChat.id) ? 'Unmute notifications' : 'Mute notifications'}
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowDisappearingDialog(true); }}>
                        <Timer className="h-4 w-4" /> Disappearing messages
                      </button>
                    </>
                  ) : (
                    <>
                      {activeChat?.type === 'group' && (
                        <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowGroupInfo(true); }}>
                          <Users className="h-4 w-4" /> Group info
                        </button>
                      )}
                      {activeChat?.type === 'direct' && (
                        <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowContactDetails(true); }}>
                          <UserIcon className="h-4 w-4" /> Contact info
                        </button>
                      )}
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowGlobalSearch(true); }}>
                        <Search className="h-4 w-4" /> Search messages
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); if (activeChat) { setMutedChats(prev => { const next = new Set(prev); if (next.has(activeChat.id)) next.delete(activeChat.id); else next.add(activeChat.id); return next; }); } }}>
                        <BellOff className="h-4 w-4" /> {activeChat && mutedChats.has(activeChat.id) ? 'Unmute notifications' : 'Mute notifications'}
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={async () => { setShowChatMenu(false); setShowStarredMessages(true); try { const msgs = await api.getStarredMessages(); setStarredMessages(msgs); } catch { showError('Failed to load starred messages'); } }}>
                        <Star className="h-4 w-4" /> Starred messages
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowDisappearingDialog(true); }}>
                        <Timer className="h-4 w-4" /> Disappearing messages
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={async () => { setShowChatMenu(false); if (activeChat) { try { await api.toggleChatLock(activeChat.id); await refreshChats(); } catch { showError('Failed to toggle chat lock'); } } }}>
                        <Lock className="h-4 w-4" /> {activeChat?.isLocked ? 'Unlock chat' : 'Lock chat'}
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setShowWallpaperDialog(true); }}>
                        <Image className="h-4 w-4" /> Chat wallpaper
                      </button>
                      {activeChat?.pinnedMessageId ? (
                        <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={async () => { setShowChatMenu(false); if (activeChat) { try { await api.pinMessage(activeChat.id, null); await refreshChats(); } catch { showError('Failed to unpin message'); } } }}>
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
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2" onClick={() => { setShowChatMenu(false); setIsSelectMode(true); setSelectedMessages(new Set()); }}>
                        <CheckCheck className="h-4 w-4" /> Select messages
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Connection status indicator */}
      {connectionStatus === 'offline' && (
        <div className="px-4 py-1.5 bg-red-500 text-white text-xs font-medium flex items-center justify-center gap-2">
          <WifiOff className="h-3 w-3" /> No internet connection — messages will be queued
        </div>
      )}
      {connectionStatus === 'reconnecting' && (
        <div className="px-4 py-1.5 bg-amber-500 text-white text-xs font-medium flex items-center justify-center gap-2">
          <WifiOff className="h-3 w-3 animate-pulse" /> Reconnecting to server...
        </div>
      )}

      {/* Enhanced Search Bar with navigation */}
      {showSearchBar && (
        <div className="px-4 py-2 bg-white border-b flex items-center gap-2 shadow-sm">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            className="flex-1 text-sm border-none outline-none bg-transparent"
            value={chatSearchQuery}
            onChange={(e) => setChatSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearchMatchIndex(prev => prev < searchMatchCount ? prev + 1 : 1);
              }
            }}
            autoFocus
          />
          {chatSearchQuery && (
            <span className="text-xs text-gray-400 whitespace-nowrap">{searchMatchIndex}/{searchMatchCount}</span>
          )}
          {chatSearchQuery && searchMatchCount > 0 && (
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSearchMatchIndex(prev => prev > 1 ? prev - 1 : searchMatchCount)}>
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSearchMatchIndex(prev => prev < searchMatchCount ? prev + 1 : 1)}>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowSearchBar(false); setChatSearchQuery(''); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Pinned message banner */}
      {activeChat?.pinnedMessageId && (() => {
        const pinnedMsg = messages.find(m => m.id === activeChat.pinnedMessageId);
        if (!pinnedMsg) return null;
        return (
          <div
            className="px-4 py-2 bg-[#246BFD]/5 border-b border-[#246BFD]/10 flex items-center gap-3 cursor-pointer hover:bg-[#246BFD]/10 transition-colors"
            onClick={() => scrollToMessage(pinnedMsg.id)}
          >
            <Pin className="h-4 w-4 text-[#246BFD] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[#246BFD] font-medium">Pinned Message</p>
              <p className="text-xs text-gray-600 truncate">{pinnedMsg.content}</p>
            </div>
            <X className="h-3 w-3 text-gray-400 flex-shrink-0" onClick={async (e) => {
              e.stopPropagation();
              if (activeChat) { try { await api.pinMessage(activeChat.id, null); await refreshChats(); } catch { /* ignore */ } }
            }} />
          </div>
        );
      })()}

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef} onScroll={handleMessagesScroll}>
        {isLoadingMessages ? (
          <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className={`${i % 2 === 0 ? 'bg-[#246BFD] text-white' : 'bg-white'} rounded-2xl p-3 max-w-[60%] shadow-sm`}>
                  <div className="skeleton h-3 w-32 mb-2" />
                  <div className="skeleton h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              {activeChat?.type === 'direct' && (
                <div className="encryption-banner inline-flex items-center gap-2 mb-4">
                  <Lock className="h-3 w-3" />
                  Messages are end-to-end encrypted. No one outside of this chat can read them.
                </div>
              )}
              <p className="text-gray-500 text-sm">
                {activeChat?.type === 'channel'
                  ? (activeChat.participants.find(p => p.userId === user?.id && p.role === 'admin')
                    ? 'Post the first message to this channel'
                    : 'Only admins can post in this channel')
                  : activeChat?.type === 'community' ? 'Welcome to the community' : 'Send a message to start chatting'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* E2EE banner at top of messages for direct chats */}
            {activeChat?.type === 'direct' && (
              <div className="flex items-center justify-center my-3">
                <div className="encryption-banner inline-flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" title="Messages are end-to-end encrypted. Click to learn more.">
                  <Lock className="h-3 w-3" />
                  Messages are end-to-end encrypted. No one outside of this chat can read them.
                </div>
              </div>
            )}
            {(chatSearchQuery ? messages.filter(m => m.content?.toLowerCase().includes(chatSearchQuery.toLowerCase())) : messages).map((message, msgIndex, filteredMsgs) => {
              const isOwn = message.senderId === user?.id;
              const isMedia = ['image', 'video', 'audio', 'video-note', 'file', 'poll', 'location', 'contact'].includes(message.type);
              const replyToMsg = message.replyToMessageId ? messages.find(m => m.id === message.replyToMessageId) : null;
              return (
                <div key={message.id}>
                  {/* Feature #8: Date separators */}
                  {shouldShowDateSeparator(msgIndex, filteredMsgs) && (
                    <div className="flex items-center justify-center my-3">
                        <div className="bg-white text-gray-600 text-[11px] font-medium px-3 py-1.5 rounded-lg shadow-sm">
                          {formatDateSeparator(message.createdAt)}
                        </div>
                    </div>
                  )}
                <div
                  id={`msg-${message.id}`}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group msg-enter relative transition-colors duration-500 ${isSelectMode ? 'cursor-pointer' : ''} ${selectedMessages.has(message.id) ? 'bg-[#246BFD]/5' : ''}`}
                  onClick={isSelectMode ? () => setSelectedMessages(prev => { const next = new Set(prev); if (next.has(message.id)) next.delete(message.id); else next.add(message.id); return next; }) : undefined}
                >
                  {isSelectMode && (
                    <div className="flex items-center mr-2 flex-shrink-0">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedMessages.has(message.id) ? 'bg-[#246BFD] border-[#246BFD]' : 'border-gray-300'}`}>
                        {selectedMessages.has(message.id) && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                  )}
                  <div className={`flex items-start gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    {/* Sender avatar in group messages */}
                    {!isOwn && (activeChat?.type === 'group' || activeChat?.type === 'community' || activeChat?.type === 'channel') && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="abhi-avatar text-white text-xs">
                          {getSenderName(message.senderId).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`w-fit max-w-[70%] lg:max-w-[60%] px-3 py-2 rounded-2xl shadow-sm ${
                        isOwn
                          ? 'bg-[#246BFD] text-white rounded-br-md'
                          : 'bg-white rounded-bl-md border border-gray-100'
                      } ${message.isDeleted ? 'opacity-60 italic' : ''}`}
                    >
                      {/* Sender name in group messages */}
                      {!isOwn && !message.isDeleted && (activeChat?.type === 'group' || activeChat?.type === 'community' || activeChat?.type === 'channel') && (
                        <p className={`text-xs font-medium mb-0.5 ${isOwn ? 'text-blue-100' : 'text-[#246BFD]'}`}>{getSenderName(message.senderId)}</p>
                      )}
                      {/* Reply preview - click to scroll to original */}
                      {replyToMsg && !message.isDeleted && (
                        <div
                          className={`border-l-4 border-[#246BFD] rounded px-2 py-1 mb-1 text-xs cursor-pointer hover:opacity-80 transition-opacity ${isOwn ? 'bg-white/15' : 'bg-[#246BFD]/5'}`}
                          onClick={() => scrollToMessage(replyToMsg.id)}
                        >
                          <p className={`font-medium truncate ${isOwn ? 'text-blue-100' : 'text-[#246BFD]'}`}>
                            {getSenderName(replyToMsg.senderId)}
                          </p>
                          <p className={`truncate ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>{replyToMsg.content}</p>
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
                        renderMediaContent(message, isOwn)
                      ) : (
                        <>
                          <p className={`text-sm break-words ${isOwn ? 'text-white' : 'text-gray-800'}`}>
                            {chatSearchQuery && message.content ? (() => {
                              const parts = message.content.split(new RegExp(`(${chatSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
                              return parts.map((part, i) =>
                                part.toLowerCase() === chatSearchQuery.toLowerCase()
                                  ? <mark key={i} className="bg-yellow-300/60 text-inherit rounded px-0.5">{part}</mark>
                                  : part
                              );
                            })() : message.content}
                          </p>
                          {/* Link preview */}
                          {linkPreviews.has(message.id) && (() => {
                            const preview = linkPreviews.get(message.id);
                            if (!preview) return null;
                            return (
                              <a href={preview.url} target="_blank" rel="noopener noreferrer" className={`block mt-1.5 rounded-lg overflow-hidden border ${isOwn ? 'border-white/20 bg-white/10' : 'border-gray-200 bg-gray-50'} hover:opacity-80 transition-opacity`}>
                                <div className="px-2.5 py-2">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <Link2 className={`h-3 w-3 flex-shrink-0 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`} />
                                    <p className={`text-[11px] font-medium truncate ${isOwn ? 'text-blue-100' : 'text-gray-700'}`}>{preview.title}</p>
                                  </div>
                                  <p className={`text-[10px] truncate ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>{preview.description}</p>
                                </div>
                              </a>
                            );
                          })()}
                        </>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {message.isStarred && !message.isDeleted && (
                          <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                        )}
                        {message.isEdited && !message.isDeleted && (
                          <span className={`text-[10px] ${isOwn ? 'text-blue-200' : 'text-gray-400'} cursor-help`} title={`Edited ${new Date(message.editedAt || message.createdAt).toLocaleString()}`}>edited</span>
                        )}
                        {activeChat?.disappearingMessagesDuration && !message.isDeleted && (
                          <Timer className={`h-2.5 w-2.5 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`} />                        )}
                        <span className={`text-[10px] ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                          {formatMessageTime(message.createdAt)}
                        </span>
                        {isOwn && getStatusIcon(message.status)}
                        {isOwn && message.status === 'failed' && (
                          <button
                            className="ml-1 text-[10px] text-red-500 hover:text-red-700 underline font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeChat && message.content) {
                                sendMessage(message.content, message.type as 'text');
                              }
                            }}
                          >
                            Retry
                          </button>
                        )}
                        {/* Seen-by for group messages */}
                        {isOwn && message.status === 'read' && (activeChat?.type === 'group' || activeChat?.type === 'community') && (
                          <button
                            className={`ml-1 text-[10px] ${isOwn ? 'text-blue-200 hover:text-white' : 'text-gray-400 hover:text-gray-600'} cursor-pointer`}
                            onClick={(e) => { e.stopPropagation(); setShowSeenByDialog(showSeenByDialog === message.id ? null : message.id); }}
                          >
                            <Eye className="h-2.5 w-2.5 inline" />
                          </button>
                        )}
                      </div>
                      {/* Seen-by popup */}
                      {showSeenByDialog === message.id && (activeChat?.type === 'group' || activeChat?.type === 'community') && (
                        <div className="mt-1 p-2 bg-white rounded-lg shadow-md border border-gray-100 text-xs">
                          <p className="font-medium text-gray-700 mb-1 flex items-center gap-1"><Eye className="h-3 w-3" /> Seen by</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {activeChat?.participants
                              .filter((p: { userId: string }) => p.userId !== user?.id)
                              .map((p: { userId: string }) => (
                                <p key={p.userId} className="text-gray-500 flex items-center gap-1">
                                  <CheckCheck className="h-3 w-3 text-[#246BFD]" />
                                  {getSenderName(p.userId)}
                                </p>
                              ))}
                          </div>
                        </div>
                      )}
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
                        onPin={async () => {
                          if (activeChat) {
                            try {
                              const newPinId = activeChat.pinnedMessageId === message.id ? null : message.id;
                              await api.pinMessage(activeChat.id, newPinId);
                              await refreshChats();
                            } catch { showError('Failed to pin message'); }
                          }
                        }}
                        isPinned={activeChat?.pinnedMessageId === message.id}
                      />
                    )}
                  </div>
                </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Scroll to bottom button with new message indicator */}
      {showScrollToBottom && (
        <div className="absolute bottom-24 right-6 z-10">
          <Button
            onClick={scrollToBottom}
            className="rounded-full bg-white shadow-lg hover:bg-[#E8F0FE] text-[#246BFD] h-10 w-10 p-0 relative border border-gray-100"
            size="icon"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Multi-select action bar */}
      {isSelectMode && (
        <div className="px-4 py-2.5 bg-white border-t border-gray-100 flex items-center gap-3 shadow-sm">
          <Button variant="ghost" size="sm" onClick={() => { setIsSelectMode(false); setSelectedMessages(new Set()); }} className="text-gray-500 hover:text-gray-700">
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <span className="text-sm text-gray-500 flex-1">{selectedMessages.size} selected</span>
          <Button variant="ghost" size="sm" disabled={selectedMessages.size === 0} onClick={() => { selectedMessages.forEach(id => deleteMessage(id, false)); setIsSelectMode(false); setSelectedMessages(new Set()); }} className="text-red-500 hover:text-red-700 hover:bg-red-50">
            <X className="h-4 w-4 mr-1" /> Delete
          </Button>
          <Button variant="ghost" size="sm" disabled={selectedMessages.size === 0} onClick={() => { const firstId = Array.from(selectedMessages)[0]; if (firstId) setShowForwardDialog(firstId); setIsSelectMode(false); setSelectedMessages(new Set()); }} className="text-[#246BFD] hover:text-[#1A56DB] hover:bg-[#246BFD]/10">
            <Send className="h-4 w-4 mr-1" /> Forward
          </Button>
          <Button variant="ghost" size="sm" disabled={selectedMessages.size === 0} onClick={() => { selectedMessages.forEach(id => toggleStar(id)); setIsSelectMode(false); setSelectedMessages(new Set()); }} className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50">
            <Star className="h-4 w-4 mr-1" /> Star
          </Button>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="px-4 py-2 bg-white border-t">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                    className="h-full bg-[#246BFD] transition-all duration-300 rounded-full"
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
            className="bg-[#246BFD] hover:bg-[#1A56DB] rounded-full"
            size="icon"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-white border-t border-gray-100 flex items-center gap-3">
          <div className="border-l-4 border-[#246BFD] pl-2 flex-1 min-w-0">
            <p className="text-xs font-medium text-[#246BFD]">
              {replyingTo.senderId === user?.id ? 'You' : getSenderName(replyingTo.senderId)}
            </p>
            <p className="text-xs text-gray-500 truncate">{replyingTo.content}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReplyingTo(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Message Input - hidden for channels where user is not admin */}
      {recordingState === 'idle' && !(activeChat?.type === 'channel' && !activeChat.participants.find(p => p.userId === user?.id && p.role === 'admin')) && (
        <div className="px-4 py-3 bg-[#F7F8FC] border-t border-gray-100">
          <div className="flex items-end gap-2">
            {/* Attach Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="text-gray-400 hover:text-[#246BFD] hover:bg-[#246BFD]/10 rounded-full transition-colors"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              
              {showAttachMenu && (
                <div className="absolute bottom-12 left-0 bg-white rounded-2xl shadow-xl p-2 flex flex-col gap-1 min-w-[180px] z-10 attach-menu-enter border border-gray-100 max-h-[400px] overflow-y-auto">
                  {/* Image quality selector */}
                  <div className="px-3 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-medium">Image quality: {imageQuality}%</span>
                    <input type="range" min={20} max={100} step={5} value={imageQuality} onChange={e => setImageQuality(Number(e.target.value))} className="w-16 h-1 accent-[#246BFD]" />
                  </div>
                  <div className="h-px bg-gray-100" />
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <Image className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm">Photo</span>
                      <span className="text-[10px] text-gray-400 block">Auto-compressed</span>
                    </div>
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
                    onClick={() => { setShowAttachMenu(false); handleCameraCapture('photo'); }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Camera</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm">Document</span>
                      <span className="text-[10px] text-gray-400 block">Up to 100MB</span>
                    </div>
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); setShowStickerPicker(true); }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                      <Sticker className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">Sticker</span>
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
                  <div className="h-px bg-gray-100" />
                  <button
                    onClick={() => {
                      setShowAttachMenu(false);
                      startVideoNoteRecording();
                    }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-[#246BFD] rounded-full flex items-center justify-center">
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
                    onClick={() => { setShowAttachMenu(false); setShowContactPicker(true); api.getAllUsers().then(users => setContactPickerUsers(users.filter(u => u.id !== user?.id))).catch(() => {}); }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-white" />
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
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  Array.from(files).forEach(file => handleImageUpload(file));
                }
                e.target.value = '';
                setShowAttachMenu(false);
              }}
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

            {/* View Once Toggle - hidden for channels/communities */}
            {activeChat?.type !== 'channel' && activeChat?.type !== 'community' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewOnceMode(!viewOnceMode)}
                className={`rounded-full transition-colors ${viewOnceMode ? 'text-[#246BFD] bg-[#246BFD]/10' : 'text-gray-400 hover:text-[#246BFD] hover:bg-[#246BFD]/10'}`}
                title={viewOnceMode ? 'View once: ON' : 'View once: OFF'}
              >
                {viewOnceMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            )}

            {/* Feature #10: Emoji Picker */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-gray-400 hover:text-[#246BFD] hover:bg-[#246BFD]/10 rounded-full transition-colors"
              >
                <Smile className="h-5 w-5" />
              </Button>
              {showEmojiPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)} />
                  <div className="absolute bottom-12 left-0 bg-white rounded-2xl shadow-xl z-20 w-[320px] max-h-[320px] flex flex-col border border-gray-100">
                    <div className="flex border-b px-2 pt-2 gap-1 text-xs">
                      {[{label:'Smileys',key:'smileys'},{label:'People',key:'people'},{label:'Nature',key:'nature'},{label:'Food',key:'food'},{label:'Objects',key:'objects'},{label:'Symbols',key:'symbols'}].map(cat => (
                        <button key={cat.key} className="px-2 py-1.5 rounded-t hover:bg-gray-100 text-gray-500 font-medium whitespace-nowrap" onClick={() => {
                          const el = document.getElementById(`emoji-cat-${cat.key}`);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}>{cat.label}</button>
                      ))}
                    </div>
                    <div className="overflow-y-auto p-2 flex-1">
                      <p id="emoji-cat-smileys" className="text-[10px] text-gray-400 font-medium mb-1 mt-1">Smileys & Emotion</p>
                      <div className="grid grid-cols-8 gap-0.5">
                        {['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','😎','🥳','🤠','😤','😭','😱','😳','🥺','😨','😰','😥','😢'].map(emoji => (
                          <button key={emoji} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg" onClick={() => { setInputValue(prev => prev + emoji); setShowEmojiPicker(false); }}>{emoji}</button>
                        ))}
                      </div>
                      <p id="emoji-cat-people" className="text-[10px] text-gray-400 font-medium mb-1 mt-2">People & Gestures</p>
                      <div className="grid grid-cols-8 gap-0.5">
                        {['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪','🦾','🫂','👤','👥','🫡','🫶'].map(emoji => (
                          <button key={emoji} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg" onClick={() => { setInputValue(prev => prev + emoji); setShowEmojiPicker(false); }}>{emoji}</button>
                        ))}
                      </div>
                      <p id="emoji-cat-nature" className="text-[10px] text-gray-400 font-medium mb-1 mt-2">Animals & Nature</p>
                      <div className="grid grid-cols-8 gap-0.5">
                        {['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦅','🦆','🦋','🐛','🌸','🌹','🌺','🌻','🌼','🌷','🌱','🌲','🌳','🍀'].map(emoji => (
                          <button key={emoji} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg" onClick={() => { setInputValue(prev => prev + emoji); setShowEmojiPicker(false); }}>{emoji}</button>
                        ))}
                      </div>
                      <p id="emoji-cat-food" className="text-[10px] text-gray-400 font-medium mb-1 mt-2">Food & Drink</p>
                      <div className="grid grid-cols-8 gap-0.5">
                        {['🍎','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍔','🍕','🌮','🍜','🍣','🍦','🍩','🍪','🎂','🍫','☕','🍵','🥤','🍺'].map(emoji => (
                          <button key={emoji} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg" onClick={() => { setInputValue(prev => prev + emoji); setShowEmojiPicker(false); }}>{emoji}</button>
                        ))}
                      </div>
                      <p id="emoji-cat-objects" className="text-[10px] text-gray-400 font-medium mb-1 mt-2">Objects & Activities</p>
                      <div className="grid grid-cols-8 gap-0.5">
                        {['⚽','🏀','🏈','⚾','🎾','🏐','🎱','🏓','🎮','🎲','🎭','🎨','🎬','🎤','🎧','🎵','🎹','🎸','🎺','📱','💻','⌨️','🖥️','📷','📹','💡','🔦','📚','✏️','📝','💼','📎'].map(emoji => (
                          <button key={emoji} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg" onClick={() => { setInputValue(prev => prev + emoji); setShowEmojiPicker(false); }}>{emoji}</button>
                        ))}
                      </div>
                      <p id="emoji-cat-symbols" className="text-[10px] text-gray-400 font-medium mb-1 mt-2">Symbols</p>
                      <div className="grid grid-cols-8 gap-0.5">
                        {['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💯','💢','💥','💫','💦','💨','🔥','⭐','🌟','✨','🎉','🎊','✅','❌','❓','❗','💬','🗨️','💭','🏆','🥇','🥈','🥉','🏅'].map(emoji => (
                          <button key={emoji} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg" onClick={() => { setInputValue(prev => prev + emoji); setShowEmojiPicker(false); }}>{emoji}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Text Input */}
            <div className="flex-1 relative">
                {/* Quick Reply Suggestions */}
                {showQuickReplySuggestions && quickReplySuggestions.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 max-h-48 overflow-y-auto z-20">
                    <div className="px-3 py-1.5 text-xs text-gray-400 font-medium">Quick Replies</div>
                    {quickReplySuggestions.map((qr) => (
                      <button
                        key={qr.id}
                        className="w-full px-3 py-2 text-left hover:bg-[#F7F8FC] flex flex-col"
                        onClick={() => {
                          setInputValue(qr.message);
                          setShowQuickReplySuggestions(false);
                        }}
                      >
                        <span className="text-xs font-mono text-[#246BFD]">{qr.shortcode}</span>
                        <span className="text-sm text-gray-600 truncate">{qr.message}</span>
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  placeholder={viewOnceMode ? 'View once mode - media will disappear after viewing' : activeChat?.type === 'channel' ? 'Broadcast a message...' : activeChat?.type === 'group' ? 'Message group...' : activeChat?.type === 'community' ? 'Message community...' : 'Type a message (type / for quick replies)'}
                  className="w-full px-4 py-2.5 bg-white rounded-2xl border border-gray-200 focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] resize-none text-sm outline-none transition-all"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                style={{ minHeight: '42px', maxHeight: '120px' }}
              />
            </div>

            {/* Schedule button */}
            {inputValue.trim() && (
              <Button
                onClick={() => setShowScheduleDialog(true)}
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-[#246BFD] hover:bg-[#246BFD]/10 rounded-full h-9 w-9"
                title="Schedule message"
              >
                <CalendarClock className="h-4 w-4" />
              </Button>
            )}

            {/* Send or Mic Button */}
            {inputValue.trim() ? (
              <Button
                onClick={handleSend}
                className="send-btn bg-[#246BFD] hover:bg-[#1A56DB] rounded-full h-10 w-10 shadow-md shadow-blue-500/20"
                size="icon"
              >
                <Send className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                onClick={startAudioRecording}
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-[#246BFD] hover:bg-[#246BFD]/10 rounded-full h-10 w-10"
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
          className="fixed inset-0 z-[5]" 
          onClick={() => setShowAttachMenu(false)}
        />
      )}

      {/* Schedule Message Dialog */}
      {showScheduleDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <CalendarClock className="h-5 w-5 text-[#246BFD]" />
              <h3 className="font-semibold text-lg">Schedule Message</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">Choose when to send this message</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Date</label>
                <input
                  type="date"
                  className="w-full mt-1 px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Time</label>
                <input
                  type="time"
                  className="w-full mt-1 px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mt-4">
              <p className="text-xs text-gray-400 mb-1">Message preview</p>
              <p className="text-sm text-gray-700 truncate">{inputValue}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowScheduleDialog(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-[#246BFD] hover:bg-[#1A56DB]"
                disabled={!scheduleDate || !scheduleTime}
                onClick={handleScheduleMessage}
              >Schedule</Button>
            </div>
          </div>
        </div>
      )}

      {/* All dialogs extracted to ChatDialogs component */}
      {/* Camera Capture Dialog */}
      {showCameraCapture && cameraStream && (
        <div className="fixed inset-0 bg-black z-[70] flex flex-col">
          <div className="flex items-center justify-between p-4">
            <h3 className="text-white font-semibold text-lg">Camera</h3>
            <div className="flex items-center gap-3">
              <div className="flex bg-white/20 rounded-full p-1">
                <button onClick={() => setCameraMode('photo')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${cameraMode === 'photo' ? 'bg-white text-black' : 'text-white'}`}>Photo</button>
                <button onClick={() => setCameraMode('video')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${cameraMode === 'video' ? 'bg-white text-black' : 'text-white'}`}>Video</button>
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" onClick={() => { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null); setShowCameraCapture(false); }}>
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <video id="camera-preview" autoPlay playsInline muted className="max-w-full max-h-full rounded-lg" ref={el => { if (el && cameraStream) el.srcObject = cameraStream; }} />
          </div>
          <div className="flex items-center justify-center p-6 gap-4">
            <button onClick={capturePhoto} className="w-16 h-16 rounded-full border-4 border-white bg-transparent hover:bg-white/20 transition-colors flex items-center justify-center">
              <div className={`w-12 h-12 rounded-full ${cameraMode === 'photo' ? 'bg-white' : 'bg-red-500'}`} />
            </button>
          </div>
        </div>
      )}

      {/* Sticker Picker Dialog */}
      {showStickerPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-4 w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Stickers</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowStickerPicker(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {['Love', 'Funny', 'Greetings', 'Animals', 'Food', 'Sports'].map(pack => (
                <button key={pack} className="px-3 py-1.5 bg-gray-100 hover:bg-[#246BFD]/10 hover:text-[#246BFD] rounded-full text-xs font-medium whitespace-nowrap transition-colors">{pack}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-4 gap-3 p-2">
                {['😀','😍','🥰','😎','🤩','😇','🥳','🤗','👋','👍','👏','🎉','❤️','🔥','⭐','🌈','🦄','🐱','🐶','🌸','🎂','🍕','🎵','💎','🚀','🎯','💪','🏆','🌟','☀️','🌙','💫'].map((sticker, i) => (
                  <button
                    key={i}
                    className="w-16 h-16 flex items-center justify-center text-3xl hover:bg-gray-100 rounded-xl transition-colors"
                    onClick={() => {
                      if (activeChat) {
                        socketService.emit('message:send', {
                          chatId: activeChat.id,
                          content: sticker,
                          type: 'sticker',
                          tempId: `temp-${Date.now()}`,
                        });
                      }
                      setShowStickerPicker(false);
                    }}
                  >
                    {sticker}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <ChatDialogs
        activeChat={activeChat}
        userId={user?.id || ''}
        user={user}
        chats={chats}
        refreshChats={refreshChats}
        selectChat={selectChat}
        editingMessage={editingMessage}
        editMessage={editMessage}
        setEditingMessage={setEditingMessage}
        showForwardDialog={showForwardDialog}
        forwardMessage={forwardMessage}
        setShowForwardDialog={setShowForwardDialog}
        showDisappearingDialog={showDisappearingDialog}
        setShowDisappearingDialog={setShowDisappearingDialog}
        showWallpaperDialog={showWallpaperDialog}
        setShowWallpaperDialog={setShowWallpaperDialog}
        showStarredMessages={showStarredMessages}
        setShowStarredMessages={setShowStarredMessages}
        starredMessages={starredMessages}
        showPollCreator={showPollCreator}
        setShowPollCreator={setShowPollCreator}
        pollQuestion={pollQuestion}
        setPollQuestion={setPollQuestion}
        pollOptions={pollOptions}
        setPollOptions={setPollOptions}
        showLocationPicker={showLocationPicker}
        setShowLocationPicker={setShowLocationPicker}
        showContactPicker={showContactPicker}
        setShowContactPicker={setShowContactPicker}
        contactPickerUsers={contactPickerUsers}
        showGifPicker={showGifPicker}
        setShowGifPicker={setShowGifPicker}
        gifSearchQuery={gifSearchQuery}
        setGifSearchQuery={setGifSearchQuery}
        gifResults={gifResults}
        setGifResults={setGifResults}
        isLoadingGifs={isLoadingGifs}
        setIsLoadingGifs={setIsLoadingGifs}
        showBackupDialog={showBackupDialog}
        setShowBackupDialog={setShowBackupDialog}
        showChatbotDialog={showChatbotDialog}
        setShowChatbotDialog={setShowChatbotDialog}
        chatbotEnabled={chatbotEnabled}
        setChatbotEnabled={setChatbotEnabled}
        chatbotRules={chatbotRules}
        setChatbotRules={setChatbotRules}
        showMediaLightbox={showMediaLightbox}
        setShowMediaLightbox={setShowMediaLightbox}
        showGroupInfo={showGroupInfo}
        setShowGroupInfo={setShowGroupInfo}
        getChatName={getChatName}
        getChatInitials={getChatInitials}
        showContactDetails={showContactDetails}
        setShowContactDetails={setShowContactDetails}
        handleVoiceCall={handleVoiceCall}
        handleVideoCall={handleVideoCall}
        showGlobalSearch={showGlobalSearch}
        setShowGlobalSearch={setShowGlobalSearch}
        globalSearchQuery={globalSearchQuery}
        setGlobalSearchQuery={setGlobalSearchQuery}
        globalSearchResults={globalSearchResults}
        setGlobalSearchResults={setGlobalSearchResults}
        showChannelInfo={showChannelInfo}
        setShowChannelInfo={setShowChannelInfo}
        showOrderDialog={showOrderDialog}
        setShowOrderDialog={setShowOrderDialog}
        orderItems={orderItems}
        setOrderItems={setOrderItems}
        showAddMemberDialog={showAddMemberDialog}
        setShowAddMemberDialog={setShowAddMemberDialog}
        availableUsersForAdd={availableUsersForAdd}
        setAvailableUsersForAdd={setAvailableUsersForAdd}
      />
    </div>
  );
}
