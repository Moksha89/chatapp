import { useState, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useCall } from '../context/CallContext';
import type { CallHistoryEntry } from '../context/CallContext';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Search, MessageSquarePlus, LogOut, User, Tag, MessageSquare, Building2, Smartphone, Users, Circle, Radio, Package, Clock, Shield, Hash, Globe, Download, Check, CheckCheck, Pin, BellOff, Archive, Star, Trash2, Plus, UserPlus, UsersRound, Phone, PhoneMissed, Video, Trash, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

// Lazy load settings panels — only loaded when user opens them
const NewChatDialog = lazy(() => import('./NewChatDialog').then(m => ({ default: m.NewChatDialog })));
const LabelsManager = lazy(() => import('./LabelsManager').then(m => ({ default: m.LabelsManager })));
const QuickRepliesManager = lazy(() => import('./QuickRepliesManager').then(m => ({ default: m.QuickRepliesManager })));
const BusinessProfileSettings = lazy(() => import('./BusinessProfileSettings').then(m => ({ default: m.BusinessProfileSettings })));
const LinkedDevicesManager = lazy(() => import('./LinkedDevicesManager').then(m => ({ default: m.LinkedDevicesManager })));
const CreateGroupDialog = lazy(() => import('./CreateGroupDialog').then(m => ({ default: m.CreateGroupDialog })));
const StatusManager = lazy(() => import('./StatusManager').then(m => ({ default: m.StatusManager })));
const BroadcastManager = lazy(() => import('./BroadcastManager').then(m => ({ default: m.BroadcastManager })));
const ProductCatalog = lazy(() => import('./ProductCatalog').then(m => ({ default: m.ProductCatalog })));
const AutoReplySettings = lazy(() => import('./AutoReplySettings').then(m => ({ default: m.AutoReplySettings })));
const PrivacySettings = lazy(() => import('./PrivacySettings').then(m => ({ default: m.PrivacySettings })));
const FriendsPanel = lazy(() => import('./FriendsPanel').then(m => ({ default: m.FriendsPanel })));
const NotificationSettings = lazy(() => import('./NotificationSettings').then(m => ({ default: m.NotificationSettings })));
const StorageManager = lazy(() => import('./StorageManager').then(m => ({ default: m.StorageManager })));
const ThemeSettings = lazy(() => import('./ThemeSettings').then(m => ({ default: m.ThemeSettings })));
const DataSaverSettings = lazy(() => import('./DataSaverSettings').then(m => ({ default: m.DataSaverSettings })));
const HelpSupportScreen = lazy(() => import('./HelpSupportScreen').then(m => ({ default: m.HelpSupportScreen })));
const AutoUpdateSettings = lazy(() => import('./AutoUpdateSettings').then(m => ({ default: m.AutoUpdateSettings })));
const ChatBackupSettings = lazy(() => import('./ChatBackupSettings').then(m => ({ default: m.ChatBackupSettings })));

export function ChatSidebar() {
  const { user, logout } = useAuth();
  const { chats, activeChat, selectChat, isLoadingChats, refreshChats, typingUsers, onlineUsers } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'groups' | 'channels' | 'communities' | 'labels' | 'calls'>('all');
  const [callFilter, setCallFilter] = useState<'all' | 'missed' | 'incoming' | 'outgoing'>('all');
  const { callHistory, clearCallHistory, initiateCall } = useCall();
  const [showNewChat, setShowNewChat] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showBusinessProfile, setShowBusinessProfile] = useState(false);
  const [showLinkedDevices, setShowLinkedDevices] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [showAutoReply, setShowAutoReply] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showStorage, setShowStorage] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [showDataSaver, setShowDataSaver] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAutoUpdate, setShowAutoUpdate] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showChannelDialog, setShowChannelDialog] = useState(false);
  const [showCommunityDialog, setShowCommunityDialog] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [communityDesc, setCommunityDesc] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chatId: string; chat?: typeof chats[0] } | null>(null);
  const [showLabelAssign, setShowLabelAssign] = useState<string | null>(null);
  const [chatLabels, setChatLabels] = useState<Record<string, string[]>>(() => {
    try { const s = localStorage.getItem('chatLabels'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [userLabels, setUserLabels] = useState<Array<{id: string; name: string; color: string}>>(() => {
    try { const s = localStorage.getItem('userLabels'); return s ? JSON.parse(s) : [{id:'1',name:'Important',color:'#EF4444'},{id:'2',name:'Work',color:'#3B82F6'},{id:'3',name:'Personal',color:'#10B981'}]; } catch { return [{id:'1',name:'Important',color:'#EF4444'},{id:'2',name:'Work',color:'#3B82F6'},{id:'3',name:'Personal',color:'#10B981'}]; }
  });
  const [newLabelName, setNewLabelName] = useState('');

  const filteredChats = chats.filter((chat) => {
    const chatName = chat.name || chat.participants.find((p) => p.userId !== user?.id)?.user?.displayName || '';
    const matchesSearch = chatName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (chatFilter === 'unread') return chat.unreadCount > 0;
    if (chatFilter === 'groups') return chat.type === 'group';
    if (chatFilter === 'channels') return chat.type === 'channel';
    if (chatFilter === 'communities') return chat.type === 'community';
    if (chatFilter === 'labels') return (chatLabels[chat.id] || []).length > 0;
    return true;
  }).sort((a, b) => {
    // Pinned chats first
    const aPinned = a.isPinned ? 1 : 0;
    const bPinned = b.isPinned ? 1 : 0;
    if (bPinned !== aPinned) return bPinned - aPinned;
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  // Persist labels to localStorage
  const saveChatLabels = (labels: Record<string, string[]>) => {
    setChatLabels(labels);
    try { localStorage.setItem('chatLabels', JSON.stringify(labels)); } catch { /* storage error */ }
  };
  const saveUserLabels = (labels: Array<{id: string; name: string; color: string}>) => {
    setUserLabels(labels);
    try { localStorage.setItem('userLabels', JSON.stringify(labels)); } catch { /* storage error */ }
  };

  const handleChatContextMenu = async (action: string, chatId: string) => {
    try {
      const { api } = await import('../services/api');
      switch (action) {
        case 'pin': await api.pinConversation(chatId, true); break;
        case 'unpin': await api.pinConversation(chatId, false); break;
        case 'mute': await api.muteConversation(chatId, true, 'forever'); break;
        case 'unmute': await api.muteConversation(chatId, false); break;
        case 'archive': await api.archiveConversation(chatId, true); break;
        case 'unarchive': await api.archiveConversation(chatId, false); break;
        case 'favorite': await api.favoriteConversation(chatId, true); break;
        case 'unfavorite': await api.favoriteConversation(chatId, false); break;
        case 'clear': await api.clearChatHistory(chatId); break;
        case 'delete': await api.clearChatHistory(chatId); break;
        case 'block': {
          if (!window.confirm('Block this contact? They won\'t be able to message or call you.')) return;
          try { await api.blockUser(chatId); } catch { /* may not exist */ }
          break;
        }
        case 'report': {
          const reason = window.prompt('Why are you reporting this chat?\n\n1. Spam\n2. Harassment\n3. Inappropriate content\n4. Impersonation\n5. Other\n\nEnter reason:');
          if (!reason) return;
          try {
            await api.reportContact(chatId, reason, '');
            alert('Report submitted. Thank you for keeping Abhi Chat safe.');
          } catch {
            alert('Chat reported. Thank you for your feedback.');
          }
          break;
        }
        case 'label': {
          setShowLabelAssign(chatId);
          setContextMenu(null);
          return;
        }
      }
      await refreshChats();
    } catch (err) {
      console.error('Chat action failed:', err);
    }
    setContextMenu(null);
  };

  const getChatTypeIcon = (type: string) => {
    switch (type) {
      case 'group': return <Users className="h-3 w-3 text-gray-400 flex-shrink-0" />;
      case 'channel': return <Hash className="h-3 w-3 text-gray-400 flex-shrink-0" />;
      case 'community': return <Globe className="h-3 w-3 text-gray-400 flex-shrink-0" />;
      default: return null;
    }
  };

  const getLastMessagePreview = (chat: typeof chats[0]) => {
    // Draft indicator - show draft text for chats with unsent drafts
    try {
      const drafts = JSON.parse(localStorage.getItem('messageDrafts') || '{}');
      const draft = drafts[chat.id];
      if (draft && chat.id !== activeChat?.id) {
        return <span className="text-[#246BFD] italic">Draft: {draft.slice(0, 30)}{draft.length > 30 ? '...' : ''}</span>;
      }
    } catch { /* ignore */ }
    // Show typing indicator in sidebar
    const chatTyping = typingUsers.get(chat.id);
    if (chatTyping && chatTyping.size > 0) {
      const typingIds = Array.from(chatTyping).filter(id => id !== user?.id);
      if (typingIds.length > 0) {
        if (chat.type === 'group' || chat.type === 'channel' || chat.type === 'community') {
          const names = typingIds.map(id => chat.participants.find(p => p.userId === id)?.user?.displayName || 'Someone');
          return `${names.join(', ')} typing...`;
        }
        return 'typing...';
      }
    }
    if (!chat.lastMessage) return 'No messages yet';
    const msg = chat.lastMessage;
    const msgContent = msg.content || '';
    const msgType = msg.type || 'text';
    // Format special message types for sidebar preview
    let content = msgContent;
    if (msgType === 'poll') {
      try { const poll = JSON.parse(msgContent); content = `\uD83D\uDCCA ${poll.question || 'Poll'}`; } catch { content = '\uD83D\uDCCA Poll'; }
    } else if (msgType === 'location') {
      try { const loc = JSON.parse(msgContent); content = `\uD83D\uDCCD ${loc.name || 'Location'}`; } catch { content = '\uD83D\uDCCD Location'; }
    } else if (msgType === 'contact') {
      try { const c = JSON.parse(msgContent); content = `\uD83D\uDC64 ${c.name || 'Contact'}`; } catch { content = '\uD83D\uDC64 Contact'; }
    } else if (msgType === 'image' || msgType === 'gif') {
      content = '\uD83D\uDCF7 Photo';
    } else if (msgType === 'video' || msgType === 'video-note') {
      content = '\uD83C\uDFA5 Video';
    } else if (msgType === 'audio') {
      content = '\uD83C\uDFA4 Voice message';
    } else if (msgType === 'file') {
      content = `\uD83D\uDCC4 ${msg.mediaName || 'Document'}`;
    }
    if (chat.type === 'group' || chat.type === 'channel' || chat.type === 'community') {
      const sender = msg.senderId === user?.id
        ? 'You'
        : chat.participants.find(p => p.userId === msg.senderId)?.user?.displayName || '';
      return sender ? `${sender}: ${content}` : content;
    }
    return content;
  };

  const isTypingInChat = (chat: typeof chats[0]) => {
    const chatTyping = typingUsers.get(chat.id);
    if (!chatTyping) return false;
    const typingIds = Array.from(chatTyping).filter(id => id !== user?.id);
    return typingIds.length > 0;
  };

  const getMessageStatusIcon = (chat: typeof chats[0]) => {
    if (!chat.lastMessage || chat.lastMessage.senderId !== user?.id) return null;
    switch (chat.lastMessage.status) {
      case 'sent': return <Check className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />;
      case 'delivered': return <CheckCheck className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />;
      case 'read': return <CheckCheck className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />;
      default: return null;
    }
  };

  const getChatName = (chat: typeof chats[0]) => {
    if (chat.name) return chat.name;
    const otherParticipant = chat.participants.find((p) => p.userId !== user?.id);
    return otherParticipant?.user?.displayName || 'Unknown';
  };

  const getChatInitials = (chat: typeof chats[0]) => {
    const name = getChatName(chat);
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="w-full md:w-96 border-r border-gray-100 bg-white flex flex-col h-full">
      <div className="p-3 bg-white border-b border-gray-100 flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-0 h-auto">
              <Avatar className="h-10 w-10">
                  <AvatarFallback className="abhi-avatar text-white font-semibold">
                    {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              {user?.displayName}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setShowLabels(true)}>
                          <Tag className="mr-2 h-4 w-4" />
                          Labels
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowQuickReplies(true)}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Quick Replies
                        </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setShowBusinessProfile(true)}>
                                                  <Building2 className="mr-2 h-4 w-4" />
                                                  Business Profile
                                                </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowLinkedDevices(true)}>
              <Smartphone className="mr-2 h-4 w-4" />
              Linked Devices
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowStatus(true)}>
              <Circle className="mr-2 h-4 w-4" />
              Status Updates
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowBroadcast(true)}>
              <Radio className="mr-2 h-4 w-4" />
              Broadcast Lists
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowProducts(true)}>
              <Package className="mr-2 h-4 w-4" />
              Product Catalog
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowAutoReply(true)}>
              <Clock className="mr-2 h-4 w-4" />
              Auto-Reply Messages
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowChannelDialog(true)}>
              <Hash className="mr-2 h-4 w-4" />
              Create Channel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowCommunityDialog(true)}>
              <Globe className="mr-2 h-4 w-4" />
              Create Community
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowFriends(true)}>
              <Users className="mr-2 h-4 w-4" />
              Friends
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowPrivacy(true)}>
              <Shield className="mr-2 h-4 w-4" />
              Privacy Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowNotifications(true)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Notification Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowThemes(true)}>
              <Tag className="mr-2 h-4 w-4" />
              Chat Themes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowStorage(true)}>
              <Package className="mr-2 h-4 w-4" />
              Storage & Data
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowBackup(true)}>
              <Globe className="mr-2 h-4 w-4" />
              Chat Backup
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowDataSaver(true)}>
              <Download className="mr-2 h-4 w-4" />
              Data Saver
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowHelp(true)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Help & Support
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowAutoUpdate(true)}>
              <Download className="mr-2 h-4 w-4" />
              App Updates
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/version/download/android" className="flex items-center cursor-pointer">
                <Download className="mr-2 h-4 w-4" />
                Download Android App
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="Add"
                className="bg-[#246BFD] hover:bg-[#1a5be0] text-white rounded-full h-9 w-9"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowFriends(true)}>
                <UserPlus className="mr-2 h-4 w-4 text-[#246BFD]" />
                Add Friend
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCreateGroup(true)}>
                <UsersRound className="mr-2 h-4 w-4 text-[#246BFD]" />
                Create Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search or start new chat"
            className="pl-10 bg-[#F7F8FC] border-0 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-none filter-pills-container" style={{ scrollbarWidth: 'none' }}>
          {(['all', 'unread', 'groups', 'channels', 'communities', 'labels', 'calls'] as const).map((filter) => (
            <button
              key={filter}
              className={`filter-pill px-3 py-1.5 text-xs rounded-full capitalize font-medium whitespace-nowrap flex-shrink-0 transition-all duration-200 ${
                chatFilter === filter
                  ? 'bg-[#246BFD] text-white shadow-sm shadow-blue-500/20'
                  : 'bg-[#F7F8FC] text-gray-500 hover:bg-[#E8F0FE] hover:text-[#246BFD]'
              }`}
              onClick={() => setChatFilter(filter)}
            >
              {filter === 'calls' ? '📞 Calls' : filter === 'labels' ? 'Labels' : filter}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {chatFilter === 'calls' ? (
          <CallHistoryView
            callHistory={callHistory}
            callFilter={callFilter}
            setCallFilter={setCallFilter}
            clearCallHistory={clearCallHistory}
            initiateCall={initiateCall}
          />
        ) : isLoadingChats ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-12 h-12 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              <MessageSquarePlus className="h-12 w-12 mx-auto opacity-50" />
            </div>
            <p className="text-gray-500 text-sm">
              {searchQuery ? 'No chats found' : 'No chats yet'}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {searchQuery ? 'Try a different search' : 'Start a new conversation!'}
            </p>
          </div>
        ) : (
          <>
            {/* Pinned section header */}
            {filteredChats.some(c => c.isPinned) && chatFilter === 'all' && (
              <div className="px-4 pt-2 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <Pin className="h-3 w-3" /> Pinned
                </span>
              </div>
            )}
            {filteredChats.map((chat, idx) => {
              // Show "All Chats" divider after pinned section
              const prevChat = idx > 0 ? filteredChats[idx - 1] : null;
              const showAllChatsHeader = chatFilter === 'all' && prevChat?.isPinned && !chat.isPinned;
              return (
                <div key={chat.id}>
                  {showAllChatsHeader && (
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">All chats</span>
                    </div>
                  )}
                  <div
                    className={`chat-item flex items-center p-3 cursor-pointer ${
                      activeChat?.id === chat.id
                        ? 'bg-[#E8F0FE] border-l-2 border-l-[#246BFD]'
                        : 'hover:bg-[#F7F8FC] border-l-2 border-l-transparent'
                    } mx-1 mb-0.5`}
                    onClick={() => selectChat(chat)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, chatId: chat.id, chat });
                    }}
                  >
                    <div className="relative mr-3 flex-shrink-0">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="abhi-avatar text-white font-medium text-sm">
                          {getChatInitials(chat)}
                        </AvatarFallback>
                      </Avatar>
                      {chat.type === 'direct' && (() => {
                        const otherUserId = chat.participants.find(p => p.userId !== user?.id)?.userId;
                        return otherUserId && onlineUsers.has(otherUserId) ? (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                        ) : null;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[15px] text-gray-900 truncate flex items-center gap-1.5">
                          {getChatTypeIcon(chat.type)}
                          {getChatName(chat)}
                        </span>
                        <span className="text-[11px] text-gray-400 ml-2 flex-shrink-0">
                          {formatTime(chat.lastMessage?.createdAt)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-0.5">
                        <span className={`text-[13px] truncate flex items-center gap-1 ${
                          isTypingInChat(chat) ? 'text-[#246BFD] italic font-medium' : 'text-gray-400'
                        }`}>
                          {!isTypingInChat(chat) && getMessageStatusIcon(chat)}
                          {getLastMessagePreview(chat)}
                        </span>
                        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                          {chat.isPinned && <Pin className="h-3.5 w-3.5 text-[#246BFD] opacity-60" />}
                          {chat.isMuted && <BellOff className="h-3.5 w-3.5 text-gray-300" />}
                          {/* Label color dots */}
                          {(chatLabels[chat.id] || []).length > 0 && (
                            <div className="flex items-center gap-0.5">
                              {(chatLabels[chat.id] || []).slice(0, 3).map(labelId => {
                                const label = userLabels.find(l => l.id === labelId);
                                return label ? (
                                  <span key={labelId} className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} title={label.name} />
                                ) : null;
                              })}
                            </div>
                          )}
                          {chat.unreadCount > 0 && (
                            <span className="unread-badge bg-[#246BFD] text-white text-[11px] font-semibold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-sm shadow-blue-500/20">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </ScrollArea>

      <Suspense fallback={null}>
        {showNewChat && <NewChatDialog open={showNewChat} onOpenChange={setShowNewChat} />}
        {showLabels && <LabelsManager isOpen={showLabels} onClose={() => setShowLabels(false)} />}
        {showQuickReplies && <QuickRepliesManager isOpen={showQuickReplies} onClose={() => setShowQuickReplies(false)} />}
        {showBusinessProfile && <BusinessProfileSettings isOpen={showBusinessProfile} onClose={() => setShowBusinessProfile(false)} />}
        {showLinkedDevices && <LinkedDevicesManager isOpen={showLinkedDevices} onClose={() => setShowLinkedDevices(false)} />}
        {showCreateGroup && <CreateGroupDialog open={showCreateGroup} onOpenChange={setShowCreateGroup} />}
        {showStatus && <StatusManager isOpen={showStatus} onClose={() => setShowStatus(false)} />}
        {showBroadcast && <BroadcastManager isOpen={showBroadcast} onClose={() => setShowBroadcast(false)} />}
        {showProducts && <ProductCatalog isOpen={showProducts} onClose={() => setShowProducts(false)} />}
        {showAutoReply && <AutoReplySettings isOpen={showAutoReply} onClose={() => setShowAutoReply(false)} />}
        {showPrivacy && <PrivacySettings isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />}
        {showFriends && <FriendsPanel isOpen={showFriends} onClose={() => setShowFriends(false)} />}
        {showNotifications && <NotificationSettings isOpen={showNotifications} onClose={() => setShowNotifications(false)} />}
        {showStorage && <StorageManager isOpen={showStorage} onClose={() => setShowStorage(false)} />}
        {showThemes && <ThemeSettings isOpen={showThemes} onClose={() => setShowThemes(false)} />}
        {showDataSaver && <DataSaverSettings isOpen={showDataSaver} onClose={() => setShowDataSaver(false)} />}
        {showHelp && <HelpSupportScreen isOpen={showHelp} onClose={() => setShowHelp(false)} />}
        {showAutoUpdate && <AutoUpdateSettings isOpen={showAutoUpdate} onClose={() => setShowAutoUpdate(false)} />}
        {showBackup && <ChatBackupSettings isOpen={showBackup} onClose={() => setShowBackup(false)} />}
      </Suspense>

      {/* Chat Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 min-w-[220px] context-menu-enter"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 240), top: Math.min(contextMenu.y, window.innerHeight - 400) }}
          >
            <button className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F7F8FC] flex items-center gap-3 text-gray-700 transition-colors" onClick={() => handleChatContextMenu(contextMenu.chat?.isPinned ? 'unpin' : 'pin', contextMenu.chatId)}>
              <Pin className="h-4 w-4 text-[#246BFD]" /> {contextMenu.chat?.isPinned ? 'Unpin' : 'Pin'} conversation
            </button>
            <button className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F7F8FC] flex items-center gap-3 text-gray-700 transition-colors" onClick={() => handleChatContextMenu(contextMenu.chat?.isMuted ? 'unmute' : 'mute', contextMenu.chatId)}>
              <BellOff className="h-4 w-4 text-[#246BFD]" /> {contextMenu.chat?.isMuted ? 'Unmute' : 'Mute'} notifications
            </button>
            <button className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F7F8FC] flex items-center gap-3 text-gray-700 transition-colors" onClick={() => handleChatContextMenu('archive', contextMenu.chatId)}>
              <Archive className="h-4 w-4 text-[#246BFD]" /> Archive chat
            </button>
            <button className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F7F8FC] flex items-center gap-3 text-gray-700 transition-colors" onClick={() => handleChatContextMenu('label', contextMenu.chatId)}>
              <Tag className="h-4 w-4 text-[#246BFD]" /> Add label
            </button>
            <button className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F7F8FC] flex items-center gap-3 text-gray-700 transition-colors" onClick={() => handleChatContextMenu('favorite', contextMenu.chatId)}>
              <Star className="h-4 w-4 text-[#246BFD]" /> Mark as favorite
            </button>
            <div className="border-t border-gray-100 my-1.5" />
            <button className="w-full px-4 py-2.5 text-sm text-left hover:bg-red-50 flex items-center gap-3 text-orange-600 transition-colors" onClick={() => handleChatContextMenu('block', contextMenu.chatId)}>
              <Shield className="h-4 w-4" /> Block contact
            </button>
            <button className="w-full px-4 py-2.5 text-sm text-left hover:bg-red-50 flex items-center gap-3 text-orange-600 transition-colors" onClick={() => handleChatContextMenu('report', contextMenu.chatId)}>
              <Tag className="h-4 w-4" /> Report
            </button>
            <button className="w-full px-4 py-2.5 text-sm text-left hover:bg-red-50 flex items-center gap-3 text-red-600 transition-colors" onClick={() => handleChatContextMenu('delete', contextMenu.chatId)}>
              <Trash2 className="h-4 w-4" /> Delete chat
            </button>
          </div>
        </>
      )}

      {/* Label Assignment Dialog */}
      {showLabelAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold mb-3 text-gray-900">Assign Labels</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {userLabels.map((label) => {
                const isAssigned = (chatLabels[showLabelAssign] || []).includes(label.id);
                return (
                  <button
                    key={label.id}
                    className={`w-full px-3 py-2.5 text-sm text-left rounded-lg flex items-center gap-2 ${isAssigned ? 'bg-[#E8F0FE] border border-[#246BFD]' : 'hover:bg-[#F7F8FC] border border-gray-100'}`}
                    onClick={() => {
                      const current = chatLabels[showLabelAssign] || [];
                      const updated = isAssigned ? current.filter(id => id !== label.id) : [...current, label.id];
                      saveChatLabels({ ...chatLabels, [showLabelAssign]: updated });
                    }}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                    {label.name}
                    {isAssigned && <Check className="h-4 w-4 ml-auto text-[#246BFD]" />}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-gray-100 mt-3 pt-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New label name..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-[#F7F8FC] outline-none focus:border-[#246BFD]"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newLabelName.trim()) {
                      const colors = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899'];
                      const newLabel = { id: Date.now().toString(), name: newLabelName.trim(), color: colors[userLabels.length % colors.length] };
                      saveUserLabels([...userLabels, newLabel]);
                      setNewLabelName('');
                    }
                  }}
                />
                <button
                  className="px-3 py-2 text-sm bg-[#246BFD] text-white rounded-lg hover:bg-[#1A56DB] disabled:opacity-50"
                  disabled={!newLabelName.trim()}
                  onClick={() => {
                    const colors = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899'];
                    const newLabel = { id: Date.now().toString(), name: newLabelName.trim(), color: colors[userLabels.length % colors.length] };
                    saveUserLabels([...userLabels, newLabel]);
                    setNewLabelName('');
                  }}
                >Add</button>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" onClick={() => { setShowLabelAssign(null); setNewLabelName(''); }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Channel Dialog */}
      {showChannelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold mb-3 text-gray-900">Create Channel</h3>
            <input
              type="text"
              placeholder="Channel name"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm mb-2 bg-[#F7F8FC] focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
            />
            <textarea
              placeholder="Description (optional)"
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3 resize-none"
              rows={2}
              value={channelDesc}
              onChange={(e) => setChannelDesc(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" onClick={() => { setShowChannelDialog(false); setChannelName(''); setChannelDesc(''); }}>Cancel</button>
              <button
                className="px-4 py-2 text-sm bg-[#246BFD] text-white rounded-xl hover:bg-[#1A56DB] disabled:opacity-50"
                disabled={!channelName.trim()}
                onClick={async () => {
                  try {
                    const { api } = await import('../services/api');
                    await api.createChannel(channelName.trim(), channelDesc.trim() || undefined);
                    setShowChannelDialog(false);
                    setChannelName('');
                    setChannelDesc('');
                    await refreshChats();
                  } catch { alert('Failed to create channel'); }
                }}
              >Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Community Dialog */}
      {showCommunityDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold mb-3 text-gray-900">Create Community</h3>
            <input
              type="text"
              placeholder="Community name"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm mb-2 bg-[#F7F8FC] focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD] outline-none"
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
            />
            <textarea
              placeholder="Description (optional)"
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3 resize-none"
              rows={2}
              value={communityDesc}
              onChange={(e) => setCommunityDesc(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" onClick={() => { setShowCommunityDialog(false); setCommunityName(''); setCommunityDesc(''); }}>Cancel</button>
              <button
                className="px-4 py-2 text-sm bg-[#246BFD] text-white rounded-xl hover:bg-[#1A56DB] disabled:opacity-50"
                disabled={!communityName.trim()}
                onClick={async () => {
                  try {
                    const { api } = await import('../services/api');
                    await api.createCommunity(communityName.trim(), communityDesc.trim() || undefined);
                    setShowCommunityDialog(false);
                    setCommunityName('');
                    setCommunityDesc('');
                    await refreshChats();
                  } catch { alert('Failed to create community'); }
                }}
              >Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Call History View component
function CallHistoryView({
  callHistory,
  callFilter,
  setCallFilter,
  clearCallHistory,
  initiateCall,
}: {
  callHistory: CallHistoryEntry[];
  callFilter: 'all' | 'missed' | 'incoming' | 'outgoing';
  setCallFilter: (f: 'all' | 'missed' | 'incoming' | 'outgoing') => void;
  clearCallHistory: () => void;
  initiateCall: (userId: string, userName: string, callType: 'audio' | 'video') => Promise<void>;
}) {
  const filtered = callHistory.filter(entry => {
    if (callFilter === 'missed') return entry.status === 'missed' || entry.status === 'no-answer';
    if (callFilter === 'incoming') return entry.direction === 'incoming';
    if (callFilter === 'outgoing') return entry.direction === 'outgoing';
    return true;
  });

  const formatCallDuration = (seconds: number) => {
    if (seconds === 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatCallTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getCallIcon = (entry: CallHistoryEntry) => {
    if (entry.status === 'missed' || entry.status === 'no-answer') {
      return <PhoneMissed className="w-4 h-4 text-red-500" />;
    }
    if (entry.direction === 'incoming') {
      return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Call filter sub-tabs */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100">
        <div className="flex gap-1">
          {(['all', 'missed', 'incoming', 'outgoing'] as const).map(f => (
            <button
              key={f}
              className={`px-2.5 py-1 text-[11px] rounded-full capitalize font-medium transition-colors ${
                callFilter === f
                  ? 'bg-[#246BFD] text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              onClick={() => setCallFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        {callHistory.length > 0 && (
          <button
            onClick={clearCallHistory}
            className="text-red-500 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
            title="Clear call history"
          >
            <Trash className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Call entries */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center">
          <Phone className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm font-medium">No call history</p>
          <p className="text-gray-400 text-xs mt-1">
            {callFilter === 'all' ? 'Your calls will appear here' : `No ${callFilter} calls`}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filtered.map(entry => (
            <div
              key={entry.id}
              className="flex items-center p-3 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50"
            >
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#246BFD] to-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {entry.peerName.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Call info */}
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`font-medium text-sm truncate ${
                    (entry.status === 'missed' || entry.status === 'no-answer') ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {entry.peerName}
                  </span>
                  {entry.isGroupCall && (
                    <Users className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {getCallIcon(entry)}
                  <span className="text-xs text-gray-500">
                    {entry.callType === 'video' ? 'Video' : 'Voice'}
                    {entry.status === 'missed' ? ' · Missed' : ''}
                    {entry.status === 'no-answer' ? ' · No answer' : ''}
                    {entry.status === 'rejected' ? ' · Declined' : ''}
                    {entry.duration > 0 ? ` · ${formatCallDuration(entry.duration)}` : ''}
                  </span>
                </div>
              </div>

              {/* Time & callback */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-[11px] text-gray-400">{formatCallTime(entry.timestamp)}</span>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); initiateCall(entry.peerId, entry.peerName, 'audio'); }}
                    className="w-8 h-8 rounded-full hover:bg-green-50 flex items-center justify-center transition-colors"
                    title="Voice call"
                  >
                    <Phone className="w-4 h-4 text-green-600" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); initiateCall(entry.peerId, entry.peerName, 'video'); }}
                    className="w-8 h-8 rounded-full hover:bg-blue-50 flex items-center justify-center transition-colors"
                    title="Video call"
                  >
                    <Video className="w-4 h-4 text-[#246BFD]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
