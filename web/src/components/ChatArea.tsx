import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { socketService } from '../services/socket';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Send, Check, CheckCheck, Clock, MessageCircle } from 'lucide-react';

export function ChatArea() {
  const { user } = useAuth();
  const { activeChat, messages, isLoadingMessages, sendMessage, typingUsers } = useChat();
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSend = () => {
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

  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const chatTypingUsers = activeChat ? typingUsers.get(activeChat.id) : undefined;
  const isOtherTyping = chatTypingUsers && chatTypingUsers.size > 0;

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-green-100 p-6 rounded-full inline-block mb-4">
            <MessageCircle className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-light text-gray-700 mb-2">WhatsApp Business Chat</h2>
          <p className="text-gray-500">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-100">
      <div className="p-3 bg-gray-200 flex items-center border-b">
        <Avatar className="h-10 w-10 mr-3">
          <AvatarFallback className="bg-green-500 text-white">
            {getChatInitials()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">{getChatName()}</h3>
          {isOtherTyping && (
            <p className="text-xs text-green-600">typing...</p>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoadingMessages ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => {
              const isOwn = message.senderId === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isOwn
                        ? 'bg-green-100 rounded-br-none'
                        : 'bg-white rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm break-words">{message.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs text-gray-500">
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

      <div className="p-3 bg-gray-200">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message"
            className="flex-1 bg-white"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="bg-green-500 hover:bg-green-600"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
