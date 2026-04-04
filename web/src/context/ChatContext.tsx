import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { useAuth } from './AuthContext';
import { sessionManager } from '../crypto';
import { offlineQueue } from '../utils/offlineQueue';

interface User {
  id: string;
  displayName: string;
  phoneNumber: string;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderDeviceId?: string;
  content?: string;
  ciphertext?: string;
  type: string;
  status: string;
  createdAt: string;
  tempId?: string;
  replyToMessageId?: string;
  reactions?: { [emoji: string]: string[] };
  isEdited?: boolean;
  isDeleted?: boolean;
  editedAt?: string;
  isStarred?: boolean;
  forwardedFrom?: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaName?: string;
  mediaSize?: number;
  mediaDuration?: number;
  expiresAt?: string;
}

interface Chat {
  id: string;
  type: string;
  name?: string;
  participants: Array<{
    id: string;
    userId: string;
    user?: User;
  }>;
  lastMessage?: Message;
  unreadCount: number;
  wallpaper?: string | null;
  isLocked?: boolean;
  pinnedMessageId?: string | null;
  disappearingMessagesDuration?: number | null;
}

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  typingUsers: Map<string, Set<string>>;
  e2eeEnabled: boolean;
  replyingTo: Message | null;
  searchQuery: string;
  searchResults: Message[];
  chatFilter: string;
  selectChat: (chat: Chat | null) => void;
  sendMessage: (content: string, replyToMessageId?: string) => void;
  createChat: (userId: string) => Promise<Chat>;
  createGroupChat: (name: string, participantIds: string[], description?: string) => Promise<Chat>;
  refreshChats: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  initializeE2EE: () => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string, deleteForEveryone: boolean) => Promise<void>;
  toggleStar: (messageId: string) => Promise<void>;
  forwardMessage: (messageId: string, targetChatId: string) => Promise<void>;
  setReplyingTo: (message: Message | null) => void;
  searchMessagesInChat: (query: string) => void;
  setSearchQuery: (query: string) => void;
  setChatFilter: (filter: string) => void;
  getFilteredChats: () => Chat[];
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, deviceId } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());
  const [e2eeEnabled, setE2eeEnabled] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [chatFilter, setChatFilter] = useState('all');

  const initializeE2EE = useCallback(async () => {
    if (!isAuthenticated || !deviceId) return;
    
    try {
      await sessionManager.initialize();
      const publicKeys = sessionManager.getPublicKeysForUpload();
      
      if (publicKeys) {
        await api.uploadKeys(deviceId, publicKeys);
        setE2eeEnabled(true);
        console.log('E2EE initialized and keys uploaded');
      }
    } catch (error) {
      console.error('Failed to initialize E2EE:', error);
    }
  }, [isAuthenticated, deviceId]);

  const ensureSession = useCallback(async (recipientId: string, recipientDeviceId: string): Promise<boolean> => {
    if (sessionManager.hasSession(recipientId, recipientDeviceId)) {
      return true;
    }

    try {
      const keyBundle = await api.getKeyBundle(recipientId, recipientDeviceId);
      if (!keyBundle) {
        console.warn('No key bundle available for recipient');
        return false;
      }

      await sessionManager.createSession(recipientId, recipientDeviceId, keyBundle);
      return true;
    } catch (error) {
      console.error('Failed to create session:', error);
      return false;
    }
  }, []);

  const encryptMessageContent = useCallback(async (
    recipientId: string,
    recipientDeviceId: string,
    plaintext: string
  ): Promise<string | null> => {
    const hasSession = await ensureSession(recipientId, recipientDeviceId);
    if (!hasSession) return null;

    try {
      const encrypted = await sessionManager.encryptMessage(recipientId, recipientDeviceId, plaintext);
      return encrypted.ciphertext;
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      return null;
    }
  }, [ensureSession]);


  const refreshChats = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingChats(true);
    try {
      const chatList = await api.getChats();
      setChats(chatList as Chat[]);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setIsLoadingChats(false);
    }
  }, [isAuthenticated]);

  const loadMessages = useCallback(async (chatId: string) => {
    setIsLoadingMessages(true);
    try {
      const messageList = await api.getMessages(chatId);
      setMessages(messageList as Message[]);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!activeChat || messages.length === 0) return;
    const oldestMessage = messages[0];
    try {
      const olderMessages = await api.getMessages(activeChat.id, 50, oldestMessage.id);
      setMessages((prev) => [...(olderMessages as Message[]), ...prev]);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    }
  }, [activeChat, messages]);

  const selectChat = useCallback((chat: Chat | null) => {
    setActiveChat(chat);
    if (chat) {
      loadMessages(chat.id);
    } else {
      setMessages([]);
    }
  }, [loadMessages]);

        const sendMessageInternal = useCallback(async (
        chatId: string,
        content: string,
        tempId: string,
        replyToMessageId?: string
      ) => {
        const chat = chats.find(c => c.id === chatId);
        if (!chat || !user) return;

        const otherParticipant = chat.participants.find(p => p.userId !== user.id);
        if (!otherParticipant) {
          console.error('No recipient found');
          return;
        }

        const recipientId = otherParticipant.userId;
        let messageContent = content;
        let ciphertext: string | undefined;

        if (e2eeEnabled) {
          const recipientDevices = await api.getDevices(recipientId);
          if (!recipientDevices || recipientDevices.length === 0) {
            throw new Error('E2EE_NO_RECIPIENT_DEVICE: Cannot send encrypted message - recipient has no registered devices');
          }
          
          const recipientDevice = recipientDevices[0];
          const encrypted = await encryptMessageContent(recipientId, recipientDevice.deviceId, content);
          if (!encrypted) {
            throw new Error('E2EE_ENCRYPTION_FAILED: Failed to encrypt message - cannot send in plaintext');
          }
          
          ciphertext = encrypted;
          messageContent = '[Encrypted message]';
        }

        socketService.emit('message:send', {
          chatId,
          content: messageContent,
          ciphertext,
          type: 'text',
          tempId,
          replyToMessageId,
        });
      }, [chats, user, e2eeEnabled, encryptMessageContent]);

      const sendMessage = useCallback(async (content: string, replyToMessageId?: string) => {
        if (!activeChat || !user || !deviceId) return;

        const tempId = `temp-${Date.now()}`;
        const tempMessage: Message = {
          id: tempId,
          chatId: activeChat.id,
          senderId: user.id,
          content,
          type: 'text',
          status: 'sending',
          createdAt: new Date().toISOString(),
          tempId,
          replyToMessageId,
        };

        setMessages((prev) => [...prev, tempMessage]);

        // Update sidebar last message preview immediately
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === activeChat.id
              ? { ...chat, lastMessage: tempMessage }
              : chat
          )
        );

        const isOnline = offlineQueue.getOnlineStatus() && socketService.isConnected();

        if (isOnline) {
          try {
            await sendMessageInternal(activeChat.id, content, tempId, replyToMessageId);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Failed to send message:', errorMessage);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.tempId === tempId 
                  ? { ...msg, status: 'failed', content: `[Failed: ${errorMessage}]` } 
                  : msg
              )
            );
          }
        } else {
          offlineQueue.queueMessage(activeChat.id, content, 'text');
          setMessages((prev) =>
            prev.map((msg) =>
              msg.tempId === tempId ? { ...msg, status: 'queued' } : msg
            )
          );
        }
      }, [activeChat, user, deviceId, sendMessageInternal]);

  const createChat = useCallback(async (userId: string): Promise<Chat> => {
    const newChat = await api.createChat({ type: 'direct', participantId: userId });
    await refreshChats();
    const createdChat = chats.find((c) => c.id === newChat.id);
    return createdChat || (newChat as Chat);
  }, [refreshChats, chats]);

  const createGroupChat = useCallback(async (name: string, participantIds: string[], description?: string): Promise<Chat> => {
    const newChat = await api.createChat({ 
      type: 'group', 
      name,
      participantIds,
      description,
    } as { type: 'direct' | 'group'; participantId?: string; name?: string; participantIds?: string[]; description?: string });
    await refreshChats();
    const createdChat = chats.find((c) => c.id === newChat.id);
    return createdChat || (newChat as Chat);
  }, [refreshChats, chats]);

  // Message Reactions
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!activeChat) return;
    try {
      const result = await api.addReaction(activeChat.id, messageId, emoji);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, reactions: result.reactions } : msg
        )
      );
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  }, [activeChat]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!activeChat) return;
    try {
      const result = await api.removeReaction(activeChat.id, messageId, emoji);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, reactions: result.reactions } : msg
        )
      );
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  }, [activeChat]);

  // Edit Message
  const editMessage = useCallback(async (messageId: string, content: string) => {
    if (!activeChat) return;
    try {
      const result = await api.editMessage(activeChat.id, messageId, content);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: result.content, isEdited: result.isEdited, editedAt: result.editedAt }
            : msg
        )
      );
    } catch (error) {
      console.error('Failed to edit message:', error);
      throw error;
    }
  }, [activeChat]);

  // Toggle Star
  const toggleStar = useCallback(async (messageId: string) => {
    if (!activeChat) return;
    try {
      const result = await api.toggleMessageStar(activeChat.id, messageId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isStarred: result.isStarred } : msg
        )
      );
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  }, [activeChat]);

  // Forward Message
  const forwardMessage = useCallback(async (messageId: string, targetChatId: string) => {
    if (!activeChat) return;
    try {
      await api.forwardMessage(activeChat.id, messageId, targetChatId);
    } catch (error) {
      console.error('Failed to forward message:', error);
    }
  }, [activeChat]);

  // Search Messages
  const searchMessagesInChat = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const filtered = messages.filter(m => 
      m.content?.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
  }, [messages]);

  // Get Filtered Chats
  const getFilteredChats = useCallback(() => {
    let filtered = chats;
    if (chatFilter === 'unread') {
      filtered = filtered.filter(c => c.unreadCount > 0);
    } else if (chatFilter === 'groups') {
      filtered = filtered.filter(c => c.type === 'group');
    } else if (chatFilter === 'channels') {
      filtered = filtered.filter(c => c.type === 'channel');
    } else if (chatFilter === 'communities') {
      filtered = filtered.filter(c => c.type === 'community');
    }
    if (searchQuery) {
      filtered = filtered.filter(c => {
        const name = c.name || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    return filtered;
  }, [chats, chatFilter, searchQuery]);

  // Delete Message
  const deleteMessage = useCallback(async (messageId: string, deleteForEveryone: boolean) => {
    if (!activeChat) return;
    try {
      const result = await api.deleteMessage(activeChat.id, messageId, deleteForEveryone);
      if (deleteForEveryone) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isDeleted: result.isDeleted, content: 'This message was deleted' } : msg
          )
        );
      } else {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  }, [activeChat]);

    useEffect(() => {
      if (isAuthenticated) {
        refreshChats();
      }
    }, [isAuthenticated, refreshChats]);

    useEffect(() => {
      offlineQueue.setMessageProcessor(async (payload: unknown) => {
        const { chatId, content } = payload as { chatId: string; content: string; messageType: string };
        const tempId = `queued-${Date.now()}`;
        await sendMessageInternal(chatId, content, tempId);
      });
    }, [sendMessageInternal]);

    useEffect(() => {
      if (!isAuthenticated) return;

        const handleNewMessage = async (data: unknown) => {
          const { message, chatId } = data as { message: Message; chatId: string };
      
          const decryptedMessage = { ...message };
      
          if (message.ciphertext && message.senderDeviceId) {
            try {
              const plaintext = await sessionManager.decryptMessage(
                message.senderId,
                message.senderDeviceId,
                message.ciphertext
              );
              decryptedMessage.content = plaintext;
            } catch (error) {
              console.warn('Failed to decrypt message:', error);
              decryptedMessage.content = '[Unable to decrypt message]';
            }
          }
      
          if (activeChat?.id === chatId) {
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === decryptedMessage.id);
              if (exists) return prev;
              return [...prev, decryptedMessage];
            });
        
            socketService.markDelivered(decryptedMessage.id);
          }

          setChats((prev) =>
            prev.map((chat) =>
              chat.id === chatId
                ? { ...chat, lastMessage: decryptedMessage, unreadCount: chat.unreadCount + 1 }
                : chat
            )
          );
        };

    const handleMessageSent = (data: unknown) => {
      const { tempId, messageId, timestamp } = data as { tempId: string; messageId: string; timestamp: string };
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === tempId
            ? { ...msg, id: messageId, status: 'sent', createdAt: timestamp }
            : msg
        )
      );
    };

    const handleMessageDelivered = (data: unknown) => {
      const { messageId } = data as { messageId: string };
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'delivered' } : msg
        )
      );
    };

    const handleMessageRead = (data: unknown) => {
      const { messageIds } = data as { messageIds: string[] };
      setMessages((prev) =>
        prev.map((msg) =>
          messageIds.includes(msg.id) ? { ...msg, status: 'read' } : msg
        )
      );
    };

    const handleTypingIndicator = (data: unknown) => {
      const { chatId, userId, isTyping } = data as { chatId: string; userId: string; isTyping: boolean };
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        const chatTyping = newMap.get(chatId) || new Set();
        if (isTyping) {
          chatTyping.add(userId);
        } else {
          chatTyping.delete(userId);
        }
        newMap.set(chatId, chatTyping);
        return newMap;
      });
    };

    // Real-time reaction updates from other users
    const handleReactionUpdated = (data: unknown) => {
      const { chatId, messageId, reactions } = data as { 
        chatId: string; 
        messageId: string; 
        reactions: { [emoji: string]: string[] };
      };
      if (activeChat?.id === chatId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, reactions } : msg
          )
        );
      }
    };

    // Real-time edit updates from other users
    const handleMessageEdited = (data: unknown) => {
      const { chatId, messageId, content, editedAt } = data as { 
        chatId: string; 
        messageId: string; 
        content: string;
        editedAt: string;
      };
      if (activeChat?.id === chatId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, content, isEdited: true, editedAt } : msg
          )
        );
      }
    };

    // Real-time delete updates from other users
    const handleMessageDeleted = (data: unknown) => {
      const { chatId, messageId } = data as { chatId: string; messageId: string };
      if (activeChat?.id === chatId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isDeleted: true, content: 'This message was deleted' } : msg
          )
        );
      }
    };

    const unsubNewMessage = socketService.on('message:new', handleNewMessage);
    const unsubMessageSent = socketService.on('message:sent', handleMessageSent);
    const unsubMessageDelivered = socketService.on('message:delivered', handleMessageDelivered);
    const unsubMessageRead = socketService.on('message:read', handleMessageRead);
    const unsubTyping = socketService.on('typing:indicator', handleTypingIndicator);
    const unsubReactionUpdated = socketService.on('message:reaction:updated', handleReactionUpdated);
    const unsubMessageEdited = socketService.on('message:edited', handleMessageEdited);
    const unsubMessageDeleted = socketService.on('message:deleted', handleMessageDeleted);

    return () => {
      unsubNewMessage();
      unsubMessageSent();
      unsubMessageDelivered();
      unsubMessageRead();
      unsubTyping();
      unsubReactionUpdated();
      unsubMessageEdited();
      unsubMessageDeleted();
    };
  }, [isAuthenticated, activeChat]);

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        messages,
        isLoadingChats,
        isLoadingMessages,
        typingUsers,
        e2eeEnabled,
        replyingTo,
        searchQuery,
        searchResults,
        chatFilter,
        selectChat,
        sendMessage,
        createChat,
        createGroupChat,
        refreshChats,
        loadMoreMessages,
        initializeE2EE,
        addReaction,
        removeReaction,
        editMessage,
        deleteMessage,
        toggleStar,
        forwardMessage,
        setReplyingTo,
        searchMessagesInChat,
        setSearchQuery,
        setChatFilter,
        getFilteredChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
