import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Search, MessageSquarePlus, LogOut, User, Tag, MessageSquare, Building2, Smartphone, Users, Circle, Radio, Package, Clock, Shield, Hash, Globe, Download, Check, CheckCheck, Pin, BellOff, Archive, Star, Trash2, UserPlus, Phone } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { NewChatDialog } from './NewChatDialog';
import { LabelsManager } from './LabelsManager';
import { QuickRepliesManager } from './QuickRepliesManager';
import { BusinessProfileSettings } from './BusinessProfileSettings';
import { LinkedDevicesManager } from './LinkedDevicesManager';
import { CreateGroupDialog } from './CreateGroupDialog';
import { StatusManager } from './StatusManager';
import { BroadcastManager } from './BroadcastManager';
import { ProductCatalog } from './ProductCatalog';
import { AutoReplySettings } from './AutoReplySettings';
import { PrivacySettings } from './PrivacySettings';

export function ChatSidebar() {
  const { user, logout } = useAuth();
  const { chats, activeChat, selectChat, isLoadingChats, refreshChats, typingUsers, onlineUsers } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'groups' | 'channels' | 'communities'>('all');
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
  const [showChannelDialog, setShowChannelDialog] = useState(false);
  const [showCommunityDialog, setShowCommunityDialog] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [communityDesc, setCommunityDesc] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chatId: string } | null>(null);

  const filteredChats = chats.filter((chat) => {
    const chatName = chat.name || chat.participants.find((p) => p.userId !== user?.id)?.user?.displayName || '';
    const matchesSearch = chatName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (chatFilter === 'unread') return chat.unreadCount > 0;
    if (chatFilter === 'groups') return chat.type === 'group';
    if (chatFilter === 'channels') return chat.type === 'channel';
    if (chatFilter === 'communities') return chat.type === 'community';
    return true;
  }).sort((a, b) => {
    // Pinned chats first
    const aPinned = (a as Record<string, unknown>).isPinned ? 1 : 0;
    const bPinned = (b as Record<string, unknown>).isPinned ? 1 : 0;
    if (bPinned !== aPinned) return bPinned - aPinned;
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  const handleChatContextMenu = async (action: string, chatId: string) => {
    try {
      const { api } = await import('../services/api');
      switch (action) {
        case 'pin': await api.pinConversation(chatId, true); break;
        case 'unpin': await api.pinConversation(chatId, false); break;
        case 'mute': await api.muteConversation(chatId, true, 'forever'); break;
        case 'unmute': await api.muteConversation(chatId, false); break;
        case 'archive': await api.archiveConversation(chatId, true); break;
        case 'favorite': await api.favoriteConversation(chatId, true); break;
        case 'unfavorite': await api.favoriteConversation(chatId, false); break;
        case 'clear': await api.clearChatHistory(chatId); break;
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
                  <AvatarFallback className="echat-avatar text-white font-semibold">
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
            <DropdownMenuItem onClick={() => setShowPrivacy(true)}>
              <Shield className="mr-2 h-4 w-4" />
              Privacy Settings
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNewChat(true)}
            title="New Chat"
          >
            <MessageSquarePlus className="h-5 w-5 text-[#246BFD]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCreateGroup(true)}
            title="Create Group"
          >
            <Users className="h-5 w-5 text-[#246BFD]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Logout"
            className="text-gray-400 hover:text-red-500"
          >
            <LogOut className="h-5 w-5" />
          </Button>
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
        <div className="flex gap-1 mt-2 flex-wrap filter-pills-container">
          {(['all', 'unread', 'groups', 'channels', 'communities'] as const).map((filter) => (
            <button
              key={filter}
              className={`filter-pill px-3 py-1.5 text-xs rounded-full capitalize font-medium ${
                chatFilter === filter
                  ? 'bg-[#246BFD] text-white shadow-sm shadow-blue-500/20'
                  : 'bg-[#F7F8FC] text-gray-500 hover:bg-[#E8F0FE] hover:text-[#246BFD]'
              }`}
              onClick={() => setChatFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoadingChats ? (
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
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item flex items-center p-3 cursor-pointer ${
                activeChat?.id === chat.id ? 'bg-[#E8F0FE]' : 'hover:bg-[#F7F8FC]'
              } mx-1 mb-0.5`}
              onClick={() => selectChat(chat)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, chatId: chat.id });
              }}
            >
              <div className="relative mr-3 flex-shrink-0">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="echat-avatar text-white font-medium">
                    {getChatInitials(chat)}
                  </AvatarFallback>
                </Avatar>
                {chat.type === 'direct' && (() => {
                  const otherUserId = chat.participants.find(p => p.userId !== user?.id)?.userId;
                  return otherUserId && onlineUsers.has(otherUserId) ? (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  ) : null;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-medium truncate flex items-center gap-1">
                    {getChatTypeIcon(chat.type)}
                    {getChatName(chat)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {formatTime(chat.lastMessage?.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm truncate flex items-center gap-1 ${isTypingInChat(chat) ? 'text-[#246BFD] italic' : 'text-gray-400'}`}>
                    {!isTypingInChat(chat) && getMessageStatusIcon(chat)}
                    {getLastMessagePreview(chat)}
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    {(chat as Record<string, unknown>).isPinned && <Pin className="h-3 w-3 text-gray-400" />}
                    {(chat as Record<string, unknown>).isMuted && <BellOff className="h-3 w-3 text-gray-400" />}
                    {chat.unreadCount > 0 && (
                      <span className="unread-badge bg-[#246BFD] text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-sm shadow-blue-500/20">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </ScrollArea>

      <NewChatDialog open={showNewChat} onOpenChange={setShowNewChat} />
      <LabelsManager isOpen={showLabels} onClose={() => setShowLabels(false)} />
      <QuickRepliesManager isOpen={showQuickReplies} onClose={() => setShowQuickReplies(false)} />
      <BusinessProfileSettings isOpen={showBusinessProfile} onClose={() => setShowBusinessProfile(false)} />
      <LinkedDevicesManager isOpen={showLinkedDevices} onClose={() => setShowLinkedDevices(false)} />
      <CreateGroupDialog open={showCreateGroup} onOpenChange={setShowCreateGroup} />
      <StatusManager isOpen={showStatus} onClose={() => setShowStatus(false)} />
      <BroadcastManager isOpen={showBroadcast} onClose={() => setShowBroadcast(false)} />
      <ProductCatalog isOpen={showProducts} onClose={() => setShowProducts(false)} />
      <AutoReplySettings isOpen={showAutoReply} onClose={() => setShowAutoReply(false)} />
      <PrivacySettings isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />

      {/* Chat Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F7F8FC] flex items-center gap-2" onClick={() => handleChatContextMenu('pin', contextMenu.chatId)}>
              <Pin className="h-4 w-4 text-gray-500" /> Pin conversation
            </button>
            <button className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F7F8FC] flex items-center gap-2" onClick={() => handleChatContextMenu('mute', contextMenu.chatId)}>
              <BellOff className="h-4 w-4 text-gray-500" /> Mute notifications
            </button>
            <button className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F7F8FC] flex items-center gap-2" onClick={() => handleChatContextMenu('archive', contextMenu.chatId)}>
              <Archive className="h-4 w-4 text-gray-500" /> Archive chat
            </button>
            <button className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F7F8FC] flex items-center gap-2" onClick={() => handleChatContextMenu('favorite', contextMenu.chatId)}>
              <Star className="h-4 w-4 text-gray-500" /> Mark as favorite
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#F7F8FC] flex items-center gap-2 text-red-500" onClick={() => handleChatContextMenu('clear', contextMenu.chatId)}>
              <Trash2 className="h-4 w-4" /> Clear chat
            </button>
          </div>
        </>
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
