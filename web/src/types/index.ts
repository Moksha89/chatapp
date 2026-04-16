export interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
  profilePhoto?: string;
  status?: string;
  isBusiness: boolean;
  lastSeen?: Date;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group' | 'channel' | 'community';
  name?: string;
  participants: ChatParticipant[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
  wallpaper?: string | null;
  isLocked?: boolean;
  pinnedMessageId?: string | null;
  disappearingMessagesDuration?: number | null;
}

export interface ChatParticipant {
  id: string;
  chatId: string;
  userId: string;
  user?: User;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderDeviceId?: string;
  content?: string;
  ciphertext?: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'poll' | 'location' | 'contact' | 'sticker' | 'template' | 'interactive' | 'flow' | 'flow_response' | 'order' | 'gif';
  status: 'sending' | 'sent' | 'delivered' | 'read';
  createdAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  tempId?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaName?: string | null;
  mediaSize?: number | null;
  mediaDuration?: number | null;
  isStarred?: boolean;
  forwardedFrom?: string | null;
  replyToMessageId?: string | null;
  reactions?: { [emoji: string]: string[] } | null;
  isEdited?: boolean;
  isDeleted?: boolean;
  editedAt?: Date | null;
  expiresAt?: Date | null;
  isViewOnce?: boolean;
  isViewed?: boolean;
}

export interface ChatbotConfig {
  chatId: string;
  enabled: boolean;
  rules: Array<{ trigger: string; response: string }>;
}

export interface Order {
  id: string;
  chatId: string;
  userId: string;
  items: Array<{ productId: string; name: string; price: number; quantity: number }>;
  total: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Label {
  id: string;
  userId: string;
  name: string;
  color: string;
}

export interface QuickReply {
  id: string;
  userId: string;
  shortcode: string;
  message: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}
