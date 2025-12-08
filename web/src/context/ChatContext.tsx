import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { useAuth } from './AuthContext';
import { sessionManager } from '../crypto';

interface User {
  id: string;
  displayName: string;
  phoneNumber: string;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content?: string;
  type: string;
  status: string;
  createdAt: string;
  tempId?: string;
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
}

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  typingUsers: Map<string, Set<string>>;
  e2eeEnabled: boolean;
  selectChat: (chat: Chat | null) => void;
  sendMessage: (content: string) => void;
  createChat: (userId: string) => Promise<Chat>;
  refreshChats: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  initializeE2EE: () => Promise<void>;
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

  const decryptMessageContent = useCallback(async (
    senderId: string,
    senderDeviceId: string,
    ciphertext: string,
    senderIdentityKey?: string,
    ephemeralKey?: string,
    usedOneTimePreKeyId?: number
  ): Promise<string | null> => {
    try {
      const plaintext = await sessionManager.decryptMessage(
        senderId,
        senderDeviceId,
        ciphertext,
        senderIdentityKey,
        ephemeralKey,
        usedOneTimePreKeyId
      );
      return plaintext;
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      return null;
    }
  }, []);

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

  const sendMessage = useCallback((content: string) => {
    if (!activeChat || !user) return;

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
    };

    setMessages((prev) => [...prev, tempMessage]);
    socketService.sendMessage(activeChat.id, content, tempId);
  }, [activeChat, user]);

  const createChat = useCallback(async (userId: string): Promise<Chat> => {
    const newChat = await api.createChat({ type: 'direct', participantId: userId });
    await refreshChats();
    const createdChat = chats.find((c) => c.id === newChat.id);
    return createdChat || (newChat as Chat);
  }, [refreshChats, chats]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshChats();
    }
  }, [isAuthenticated, refreshChats]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleNewMessage = (data: unknown) => {
      const { message, chatId } = data as { message: Message; chatId: string };
      
      if (activeChat?.id === chatId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === message.id);
          if (exists) return prev;
          return [...prev, message];
        });
        
        socketService.markDelivered(message.id);
      }

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, lastMessage: message, unreadCount: chat.unreadCount + 1 }
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

    const unsubNewMessage = socketService.on('message:new', handleNewMessage);
    const unsubMessageSent = socketService.on('message:sent', handleMessageSent);
    const unsubMessageDelivered = socketService.on('message:delivered', handleMessageDelivered);
    const unsubMessageRead = socketService.on('message:read', handleMessageRead);
    const unsubTyping = socketService.on('typing:indicator', handleTypingIndicator);

    return () => {
      unsubNewMessage();
      unsubMessageSent();
      unsubMessageDelivered();
      unsubMessageRead();
      unsubTyping();
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
        selectChat,
        sendMessage,
        createChat,
        refreshChats,
        loadMoreMessages,
        initializeE2EE,
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
