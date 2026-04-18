'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, LogOut, Settings, User, Phone as PhoneIcon, MessageCircle, X, Edit2, Check } from 'lucide-react';
import api from '@/lib/api';
import socketService from '@/lib/socket';
import ChatRoom from './ChatRoom';
import CallDialog from './CallDialog';

interface ChatAppProps {
  user: any;
  onLogout: () => void;
}

export default function ChatApp({ user, onLogout }: ChatAppProps) {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editingAbout, setEditingAbout] = useState(false);
  const [editAbout, setEditAbout] = useState('');
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const activeChatRef = useRef<string | null>(null);

  // Load chats
  const loadChats = useCallback(async () => {
    try {
      const data = await api.getChats();
      setChats(data);
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  }, []);

  useEffect(() => {
    loadChats();
    api.getMe().then((u: any) => {
      setCurrentUser(u);
      setEditAbout(u.about || '');
    }).catch(() => {});
  }, [loadChats]);

  // Keep ref in sync
  useEffect(() => {
    activeChatRef.current = activeChatId;
  }, [activeChatId]);

  // Socket events
  useEffect(() => {
    const handleNewMessage = (data: any) => {
      const msg = data.message;
      // Update chat list
      setChats((prev) => {
        const updated = prev.map((c) => {
          if (c.id === msg.chatId) {
            return {
              ...c,
              lastMessage: {
                id: msg.id,
                text: msg.text,
                type: msg.type,
                senderId: msg.senderId,
                senderName: msg.sender?.displayName,
                createdAt: msg.createdAt,
                status: msg.status,
              },
              updatedAt: msg.createdAt,
              unreadCount: activeChatRef.current === msg.chatId ? 0 : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        });
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    };

    const handleIncomingCall = (data: any) => {
      setIncomingCall(data);
    };

    const handleCallEnded = () => {
      setActiveCall(null);
      setIncomingCall(null);
    };

    socketService.on('message:new', handleNewMessage);
    socketService.on('call:incoming', handleIncomingCall);
    socketService.on('call:ended', handleCallEnded);
    socketService.on('call:rejected', handleCallEnded);
    socketService.on('call:timeout', handleCallEnded);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('call:incoming', handleIncomingCall);
      socketService.off('call:ended', handleCallEnded);
      socketService.off('call:rejected', handleCallEnded);
      socketService.off('call:timeout', handleCallEnded);
    };
  }, []);

  const handleSelectChat = async (chat: any) => {
    setActiveChatId(chat.id);
    setActiveChat(chat);
    // Clear unread
    setChats((prev) => prev.map((c) => c.id === chat.id ? { ...c, unreadCount: 0 } : c));
    api.markRead(chat.id).catch(() => {});
  };

  const handleNewChat = async (otherUser: any) => {
    try {
      const chat = await api.createDirectChat(otherUser.id);
      setShowNewChat(false);
      setSearchQuery('');
      setSearchResults([]);
      await loadChats();
      handleSelectChat({
        id: chat.id,
        type: chat.type,
        title: otherUser.displayName || otherUser.phone,
        participants: chat.members?.map((m: any) => m.user) || [],
      });
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length >= 1) {
      try {
        const results = await api.searchUsers(q);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    try {
      await api.updateProfile({ displayName: editName.trim() });
      setCurrentUser((prev: any) => ({ ...prev, displayName: editName.trim() }));
      setEditingName(false);
    } catch (err) {
      console.error('Failed to update name:', err);
    }
  };

  const handleSaveAbout = async () => {
    try {
      await api.updateProfile({ about: editAbout.trim() });
      setCurrentUser((prev: any) => ({ ...prev, about: editAbout.trim() }));
      setEditingAbout(false);
    } catch (err) {
      console.error('Failed to update about:', err);
    }
  };

  const handleStartCall = (chatId: string, targetUserId: string, type: 'AUDIO' | 'VIDEO') => {
    setActiveCall({ chatId, targetUserId, type, isOutgoing: true });
  };

  const handleAnswerCall = () => {
    if (incomingCall) {
      // Send answer with the shared LiveKit room name so caller knows to connect
      socketService.emit('call:answer', {
        callerId: incomingCall.callerId,
        chatId: incomingCall.chatId,
        livekitRoom: incomingCall.livekitRoom,
      });
      setActiveCall({ ...incomingCall, isOutgoing: false });
      setIncomingCall(null);
    }
  };

  const handleDeclineCall = () => {
    if (incomingCall) {
      socketService.emit('call:reject', { callerId: incomingCall.callerId, chatId: incomingCall.chatId });
      setIncomingCall(null);
    }
  };

  const handleEndCall = () => {
    if (activeCall) {
      socketService.emit('call:end', { targetUserId: activeCall.targetUserId || activeCall.callerId, chatId: activeCall.chatId });
    }
    setActiveCall(null);
  };

  const filteredChats = chats.filter((c) =>
    !searchQuery || c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-screen flex bg-white">
      {/* Sidebar */}
      <div className={`w-full md:w-96 border-r border-gray-100 flex flex-col ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center gap-3">
          <button
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-primary font-semibold"
          >
            {currentUser?.displayName?.[0]?.toUpperCase() || '?'}
          </button>
          <h1 className="text-lg font-semibold text-gray-800 flex-1">Abhi Chat</h1>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No chats yet</p>
              <p className="text-sm mt-1">Tap + to start a conversation</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => handleSelectChat(chat)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                  activeChatId === chat.id ? 'bg-blue-50 border-l-3 border-l-primary' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-primary font-semibold text-lg">
                    {chat.title?.[0]?.toUpperCase() || '?'}
                  </div>
                  {chat.participants?.some((p: any) => p.id !== currentUser?.id && p.isOnline) && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800 truncate">{chat.title}</span>
                    {chat.lastMessage && (
                      <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                        {formatTime(chat.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm text-gray-500 truncate flex-1">
                      {chat.lastMessage?.text || 'No messages yet'}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="bg-primary text-white text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
        {activeChatId && activeChat ? (
          <ChatRoom
            chatId={activeChatId}
            chat={activeChat}
            currentUser={currentUser}
            onBack={() => { setActiveChatId(null); setActiveChat(null); loadChats(); }}
            onStartCall={handleStartCall}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Abhi Chat</h2>
              <p className="text-gray-400">Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowNewChat(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-96 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">New Chat</h3>
              <button onClick={() => setShowNewChat(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder="Search by name or phone..."
                className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800"
                autoFocus
                onChange={(e) => {
                  const q = e.target.value;
                  if (q.length >= 1) {
                    api.searchUsers(q).then(setSearchResults).catch(() => {});
                  } else {
                    api.getAllUsers().then(setSearchResults).catch(() => {});
                  }
                }}
              />
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleNewChat(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-primary font-semibold">
                    {u.displayName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-800">{u.displayName || u.phone}</p>
                    <p className="text-xs text-gray-400">{u.phone}</p>
                  </div>
                </button>
              ))}
              {searchResults.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">Search for users to start chatting</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Sidebar */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex">
          <div className="bg-black/50 absolute inset-0" onClick={() => setShowSettings(false)} />
          <div className="relative w-80 bg-white h-full shadow-xl flex flex-col animate-slide-in">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Section */}
            <div className="p-6 border-b border-gray-100">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-primary text-2xl font-bold mx-auto mb-4">
                {currentUser?.displayName?.[0]?.toUpperCase() || '?'}
              </div>

              {/* Name */}
              <div className="flex items-center justify-center gap-2 mb-1">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-center text-lg font-semibold text-gray-800 border-b-2 border-primary focus:outline-none bg-transparent"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    />
                    <button onClick={handleSaveName} className="text-primary"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingName(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <>
                    <span className="text-lg font-semibold text-gray-800">{currentUser?.displayName}</span>
                    <button onClick={() => { setEditName(currentUser?.displayName || ''); setEditingName(true); }}>
                      <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-400 text-center">{currentUser?.phone}</p>

              {/* About */}
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-1">About</p>
                {editingAbout ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editAbout}
                      onChange={(e) => setEditAbout(e.target.value)}
                      className="text-sm text-gray-600 border-b border-primary focus:outline-none bg-transparent flex-1"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveAbout()}
                    />
                    <button onClick={handleSaveAbout} className="text-primary"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditingAbout(false)} className="text-gray-400"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-600 flex-1">{currentUser?.about || 'Hey there! I am using Abhi Chat'}</p>
                    <button onClick={() => { setEditAbout(currentUser?.about || ''); setEditingAbout(true); }}>
                      <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto">
              <div className="py-2">
                {[
                  { icon: User, label: 'Profile', desc: 'Edit your profile' },
                  { icon: Settings, label: 'Account', desc: 'Privacy, security' },
                  { icon: PhoneIcon, label: 'Calls', desc: 'Call history' },
                ].map((item) => (
                  <button key={item.label} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Logout */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Log out</span>
              </button>
              <p className="text-xs text-gray-300 text-center mt-2">Abhi Chat v2.0.0</p>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Call */}
      {incomingCall && !activeCall && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm mx-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-primary text-2xl font-bold mx-auto mb-4">
              {incomingCall.callerName?.[0]?.toUpperCase() || '?'}
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-1">{incomingCall.callerName}</h3>
            <p className="text-gray-500 mb-6">Incoming {incomingCall.type?.toLowerCase()} call</p>
            <div className="flex gap-4 justify-center">
              <button onClick={handleDeclineCall} className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg">
                <PhoneIcon className="w-6 h-6 rotate-135" />
              </button>
              <button onClick={handleAnswerCall} className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg">
                <PhoneIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call */}
      {activeCall && (
        <CallDialog
          call={activeCall}
          currentUser={currentUser}
          onEnd={handleEndCall}
        />
      )}
    </div>
  );
}
