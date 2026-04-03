import { forwardRef } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import {
  Check,
  CheckCheck,
  Clock,
  Star,
  FileText,
  Download,
  BarChart3,
  MapPin,
  User,
} from 'lucide-react';
import { MessageContextMenu, MessageReactions } from '../MessageContextMenu';

interface Message {
  id: string;
  senderId: string;
  content?: string;
  type: string;
  status: string;
  createdAt: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaName?: string;
  mediaSize?: number;
  isStarred?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyToMessageId?: string;
  forwardedFrom?: string;
  reactions?: Record<string, string[]>;
}

interface MessageListProps {
  messages: Message[];
  userId: string;
  isLoading: boolean;
  searchQuery: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (id: string, content: string) => void;
  onDeleteMessage: (messageId: string, deleteForEveryone: boolean) => void;
  onReply: (message: Message) => void;
  onToggleStar: (messageId: string) => void;
  onForward: (messageId: string) => void;
}

function formatMessageTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusIcon(status: string) {
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
}

function renderMediaContent(message: {
  type: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaName?: string;
  mediaSize?: number;
}) {
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
}

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

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(function MessageList(
  {
    messages,
    userId,
    isLoading,
    searchQuery,
    onAddReaction,
    onRemoveReaction,
    onEditMessage,
    onDeleteMessage,
    onReply,
    onToggleStar,
    onForward,
  },
  ref,
) {
  if (isLoading) {
    return (
      <ScrollArea className="flex-1 p-4" ref={ref}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse text-gray-500">Loading messages...</div>
        </div>
      </ScrollArea>
    );
  }

  if (messages.length === 0) {
    return (
      <ScrollArea className="flex-1 p-4" ref={ref}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500 bg-white/80 px-6 py-4 rounded-lg shadow-sm">
            <p>No messages yet</p>
            <p className="text-sm mt-1">Start the conversation!</p>
          </div>
        </div>
      </ScrollArea>
    );
  }

  const filteredMessages = searchQuery
    ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <ScrollArea className="flex-1 p-4" ref={ref}>
      <div className="space-y-2">
        {filteredMessages.map((message) => {
          const isOwn = message.senderId === userId;
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
                  {replyToMsg && !message.isDeleted && (
                    <div className="border-l-4 border-green-500 bg-black/5 rounded px-2 py-1 mb-1 text-xs">
                      <p className="font-medium text-green-700 truncate">
                        {replyToMsg.senderId === userId ? 'You' : 'Them'}
                      </p>
                      <p className="text-gray-600 truncate">{replyToMsg.content}</p>
                    </div>
                  )}
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
                      userId={userId}
                      onAddReaction={(emoji) => onAddReaction(message.id, emoji)}
                      onRemoveReaction={(emoji) => onRemoveReaction(message.id, emoji)}
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
                    userId={userId}
                    createdAt={message.createdAt}
                    onAddReaction={(emoji) => onAddReaction(message.id, emoji)}
                    onRemoveReaction={(emoji) => onRemoveReaction(message.id, emoji)}
                    onEdit={() => onEditMessage(message.id, message.content || '')}
                    onDelete={(deleteForEveryone) => onDeleteMessage(message.id, deleteForEveryone)}
                    onCopy={() => navigator.clipboard.writeText(message.content || '')}
                    onReply={() => onReply(message)}
                    onStar={() => onToggleStar(message.id)}
                    onForward={() => onForward(message.id)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
});
