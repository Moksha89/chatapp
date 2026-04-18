'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Phone, Video, Send, Smile, Paperclip, Check, CheckCheck, Clock, Image, File, Mic } from 'lucide-react';
import api from '@/lib/api';
import socketService from '@/lib/socket';

interface ChatRoomProps {
  chatId: string;
  chat: any;
  currentUser: any;
  onBack: () => void;
  onStartCall: (chatId: string, targetUserId: string, type: 'AUDIO' | 'VIDEO') => void;
}

export default function ChatRoom({ chatId, chat, currentUser, onBack, onStartCall }: ChatRoomProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find the other user in a direct chat
  useEffect(() => {
    if (chat?.participants) {
      const other = chat.participants.find((p: any) => p.id !== currentUser?.id);
      if (other) {
        setOtherUser(other);
        setIsOnline(other.isOnline || false);
        setLastSeen(other.lastSeen || null);
      }
    }
  }, [chat, currentUser]);

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await api.getMessages(chatId);
      const raw = Array.isArray(data) ? data : (data?.messages || []);
      const sorted = raw.sort(
        (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setMessages(sorted);
      messageIdsRef.current = new Set(sorted.map((m: any) => m.id));
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket events for this chat
  useEffect(() => {
    const handleNewMessage = (data: any) => {
      const msg = data.message;
      if (msg.chatId !== chatId) return;
      if (messageIdsRef.current.has(msg.id)) return;
      messageIdsRef.current.add(msg.id);
      setMessages((prev) => [...prev, msg]);
      // Mark as read if from other user
      if (msg.senderId !== currentUser?.id) {
        api.markRead(chatId).catch(() => {});
      }
    };

    const handleTypingStart = (data: any) => {
      if (data.chatId === chatId && data.userId !== currentUser?.id) {
        setTypingUser(data.displayName || 'Someone');
        setTyping(true);
      }
    };

    const handleTypingStop = (data: any) => {
      if (data.chatId === chatId && data.userId !== currentUser?.id) {
        setTyping(false);
      }
    };

    const handleUserOnline = (data: any) => {
      if (otherUser && data.userId === otherUser.id) {
        setIsOnline(true);
      }
    };

    const handleUserOffline = (data: any) => {
      if (otherUser && data.userId === otherUser.id) {
        setIsOnline(false);
        setLastSeen(new Date().toISOString());
      }
    };

    // Handle message:sent — replaces optimistic message with real server message
    const handleMessageSent = (data: any) => {
      const { tempId, message } = data;
      if (!message || message.chatId !== chatId) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === tempId) {
            // Replace optimistic message with real one
            messageIdsRef.current.delete(tempId);
            messageIdsRef.current.add(message.id);
            return { ...message, status: message.status || 'SENT' };
          }
          return m;
        })
      );
    };

    const handleMessageDelivered = (data: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, status: 'DELIVERED' } : m))
      );
    };

    const handleMessageRead = (data: any) => {
      if (data.chatId === chatId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === currentUser?.id && m.status !== 'READ' ? { ...m, status: 'READ' } : m
          )
        );
      }
    };

    socketService.on('message:new', handleNewMessage);
    socketService.on('message:sent', handleMessageSent);
    socketService.on('typing:start', handleTypingStart);
    socketService.on('typing:stop', handleTypingStop);
    socketService.on('user:online', handleUserOnline);
    socketService.on('user:offline', handleUserOffline);
    socketService.on('message:delivered', handleMessageDelivered);
    socketService.on('message:read', handleMessageRead);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('message:sent', handleMessageSent);
      socketService.off('typing:start', handleTypingStart);
      socketService.off('typing:stop', handleTypingStop);
      socketService.off('user:online', handleUserOnline);
      socketService.off('user:offline', handleUserOffline);
      socketService.off('message:delivered', handleMessageDelivered);
      socketService.off('message:read', handleMessageRead);
    };
  }, [chatId, currentUser, otherUser]);

  const handleSend = () => {
    if (!text.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      chatId,
      senderId: currentUser?.id,
      text: text.trim(),
      type: 'TEXT',
      status: 'SENDING',
      createdAt: new Date().toISOString(),
      sender: currentUser,
    };

    setMessages((prev) => [...prev, optimistic]);
    messageIdsRef.current.add(tempId);

    socketService.emit('message:send', {
      chatId,
      text: text.trim(),
      type: 'TEXT',
      tempId,
    });

    setText('');
    socketService.emit('typing:stop', { chatId });
  };

  const handleTyping = (value: string) => {
    setText(value);
    socketService.emit('typing:start', { chatId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketService.emit('typing:stop', { chatId });
    }, 2000);
  };

  const formatMessageTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (date: string | null) => {
    if (!date) return 'offline';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'last seen just now';
    if (diffMins < 60) return `last seen ${diffMins}m ago`;
    return `last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getStatusIcon = (status: string, isMine: boolean) => {
    if (!isMine) return null;
    switch (status) {
      case 'SENDING':
        return <Clock className="w-3.5 h-3.5 text-blue-200" />;
      case 'SENT':
        return <Check className="w-3.5 h-3.5 text-blue-200" />;
      case 'DELIVERED':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-200" />;
      case 'READ':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-300" />;
      default:
        return <Check className="w-3.5 h-3.5 text-blue-200" />;
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: any[] }[] = [];
  let currentDate = '';
  messages.forEach((msg) => {
    const msgDate = new Date(msg.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages.push(msg);
  });

  const chatTitle = chat?.title || otherUser?.displayName || otherUser?.phone || 'Chat';

  const handleCall = (type: 'AUDIO' | 'VIDEO') => {
    if (otherUser) {
      onStartCall(chatId, otherUser.id, type);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="md:hidden text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-primary font-semibold">
            {chatTitle[0]?.toUpperCase() || '?'}
          </div>
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 truncate">{chatTitle}</h3>
          <p className="text-xs text-gray-400">
            {typing ? (
              <span className="text-primary">typing...</span>
            ) : isOnline ? (
              <span className="text-green-500">online</span>
            ) : (
              formatLastSeen(lastSeen)
            )}
          </p>
        </div>
        <button onClick={() => handleCall('AUDIO')} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <Phone className="w-5 h-5 text-gray-500" />
        </button>
        <button onClick={() => handleCall('VIDEO')} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
          <Video className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-2 flex flex-col justify-end min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            {groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <span className="bg-white text-gray-400 text-xs px-3 py-1 rounded-full shadow-sm">
                    {group.date}
                  </span>
                </div>

                {group.messages.map((msg) => {
                  const isMine = msg.senderId === currentUser?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1.5`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl ${
                          isMine
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        {/* Message content */}
                        {msg.type === 'IMAGE' && msg.attachments?.[0] && (
                          <img
                            src={msg.attachments[0].fileUrl}
                            alt="Photo"
                            className="rounded-lg max-w-full mb-1"
                          />
                        )}
                        {msg.text && <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>}

                        {/* Time + Status */}
                        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : ''}`}>
                          <span className={`text-xs ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                            {formatMessageTime(msg.createdAt)}
                          </span>
                          {getStatusIcon(msg.status, isMine)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex justify-start mb-1.5">
                <div className="bg-white px-4 py-2.5 rounded-2xl rounded-bl-sm shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-100">
        <div className="flex items-end gap-2">
          <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0">
            <Smile className="w-5 h-5 text-gray-500" />
          </button>
          <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0">
            <Paperclip className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex-1 min-w-0">
            <textarea
              value={text}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-2.5 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-gray-800 max-h-32"
              style={{ minHeight: '40px' }}
            />
          </div>
          {text.trim() ? (
            <button
              onClick={handleSend}
              className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shadow-md hover:bg-primary-dark transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
