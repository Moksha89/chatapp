import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
  profilePhoto: string | null;
  isBusiness: boolean;
  status: string | null;
  lastSeen: Date | null;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Device {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'android' | 'web' | 'ios';
  identityPublicKey: string | null;
  signedPrekeyPublic: string | null;
  signedPrekeySignature: string | null;
  isPrimary: boolean;
  lastSeen: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OneTimePrekey {
  id: string;
  deviceId: string;
  keyId: number;
  publicKey: string;
  isUsed: boolean;
  createdAt: Date;
}

export interface BusinessProfile {
  id: string;
  userId: string;
  businessName: string;
  description: string | null;
  category: string | null;
  address: string | null;
  businessHours: string | null;
  email: string | null;
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  ownerId: string;
  contactUserId: string | null;
  name: string;
  phoneNumber: string;
  email: string | null;
  notes: string | null;
  lastContactDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatParticipant {
  id: string;
  chatId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  lastReadAt: Date | null;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderDeviceId: string | null;
  content: string;
  ciphertext: string | null;
  type: 'text' | 'image' | 'file' | 'audio';
  status: 'sent' | 'delivered' | 'read';
  createdAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
}

export interface Label {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatLabel {
  id: string;
  chatId: string;
  labelId: string;
  createdAt: Date;
}

export interface QuickReply {
  id: string;
  userId: string;
  shortcode: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshToken {
  id: string;
  userId: string;
  deviceId: string | null;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface WebSession {
  id: string;
  pairingCode: string;
  userId: string | null;
  deviceId: string | null;
  status: 'pending' | 'paired' | 'expired';
  expiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class DatabaseService {
  private users: Map<string, User> = new Map();
  private devices: Map<string, Device> = new Map();
  private oneTimePrekeys: Map<string, OneTimePrekey> = new Map();
  private businessProfiles: Map<string, BusinessProfile> = new Map();
  private contacts: Map<string, Contact> = new Map();
  private chats: Map<string, Chat> = new Map();
  private chatParticipants: Map<string, ChatParticipant> = new Map();
  private messages: Map<string, Message> = new Map();
  private labels: Map<string, Label> = new Map();
  private chatLabels: Map<string, ChatLabel> = new Map();
  private quickReplies: Map<string, QuickReply> = new Map();
  private refreshTokens: Map<string, RefreshToken> = new Map();
  private webSessions: Map<string, WebSession> = new Map();

  generateId(): string {
    return uuidv4();
  }

  createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const user: User = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  findUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  findUserByPhone(phoneNumber: string): User | undefined {
    return Array.from(this.users.values()).find(
      (u) => u.phoneNumber === phoneNumber,
    );
  }

  updateUser(id: string, data: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  createDevice(data: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>): Device {
    const device: Device = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.devices.set(device.id, device);
    return device;
  }

  findDeviceById(id: string): Device | undefined {
    return this.devices.get(id);
  }

  findDevicesByUserId(userId: string): Device[] {
    return Array.from(this.devices.values()).filter((d) => d.userId === userId);
  }

  findDeviceByUserAndDeviceId(userId: string, deviceId: string): Device | undefined {
    return Array.from(this.devices.values()).find(
      (d) => d.userId === userId && d.deviceId === deviceId,
    );
  }

  updateDevice(id: string, data: Partial<Device>): Device | undefined {
    const device = this.devices.get(id);
    if (!device) return undefined;
    const updated = { ...device, ...data, updatedAt: new Date() };
    this.devices.set(id, updated);
    return updated;
  }

  deleteDevice(id: string): boolean {
    return this.devices.delete(id);
  }

  createOneTimePrekey(data: Omit<OneTimePrekey, 'id' | 'createdAt'>): OneTimePrekey {
    const prekey: OneTimePrekey = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
    };
    this.oneTimePrekeys.set(prekey.id, prekey);
    return prekey;
  }

  findUnusedPrekeyByDeviceId(deviceId: string): OneTimePrekey | undefined {
    return Array.from(this.oneTimePrekeys.values()).find(
      (p) => p.deviceId === deviceId && !p.isUsed,
    );
  }

  markPrekeyAsUsed(id: string): void {
    const prekey = this.oneTimePrekeys.get(id);
    if (prekey) {
      prekey.isUsed = true;
      this.oneTimePrekeys.set(id, prekey);
    }
  }

  countUnusedPrekeysByDeviceId(deviceId: string): number {
    return Array.from(this.oneTimePrekeys.values()).filter(
      (p) => p.deviceId === deviceId && !p.isUsed,
    ).length;
  }

  createBusinessProfile(data: Omit<BusinessProfile, 'id' | 'createdAt' | 'updatedAt'>): BusinessProfile {
    const profile: BusinessProfile = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.businessProfiles.set(profile.id, profile);
    return profile;
  }

  findBusinessProfileByUserId(userId: string): BusinessProfile | undefined {
    return Array.from(this.businessProfiles.values()).find(
      (p) => p.userId === userId,
    );
  }

  updateBusinessProfile(id: string, data: Partial<BusinessProfile>): BusinessProfile | undefined {
    const profile = this.businessProfiles.get(id);
    if (!profile) return undefined;
    const updated = { ...profile, ...data, updatedAt: new Date() };
    this.businessProfiles.set(id, updated);
    return updated;
  }

  createContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
    const contact: Contact = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.contacts.set(contact.id, contact);
    return contact;
  }

  findContactById(id: string): Contact | undefined {
    return this.contacts.get(id);
  }

  findContactsByOwnerId(ownerId: string): Contact[] {
    return Array.from(this.contacts.values()).filter(
      (c) => c.ownerId === ownerId,
    );
  }

  updateContact(id: string, data: Partial<Contact>): Contact | undefined {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;
    const updated = { ...contact, ...data, updatedAt: new Date() };
    this.contacts.set(id, updated);
    return updated;
  }

  deleteContact(id: string): boolean {
    return this.contacts.delete(id);
  }

  createChat(data: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>): Chat {
    const chat: Chat = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.chats.set(chat.id, chat);
    return chat;
  }

  findChatById(id: string): Chat | undefined {
    return this.chats.get(id);
  }

  findDirectChatBetweenUsers(userId1: string, userId2: string): Chat | undefined {
    const participants = Array.from(this.chatParticipants.values());
    const chats = Array.from(this.chats.values()).filter((c) => c.type === 'direct');
    
    for (const chat of chats) {
      const chatParticipants = participants.filter((p) => p.chatId === chat.id);
      if (chatParticipants.length === 2) {
        const userIds = chatParticipants.map((p) => p.userId);
        if (userIds.includes(userId1) && userIds.includes(userId2)) {
          return chat;
        }
      }
    }
    return undefined;
  }

  updateChat(id: string, data: Partial<Chat>): Chat | undefined {
    const chat = this.chats.get(id);
    if (!chat) return undefined;
    const updated = { ...chat, ...data, updatedAt: new Date() };
    this.chats.set(id, updated);
    return updated;
  }

  createChatParticipant(data: Omit<ChatParticipant, 'id'>): ChatParticipant {
    const participant: ChatParticipant = {
      ...data,
      id: this.generateId(),
    };
    this.chatParticipants.set(participant.id, participant);
    return participant;
  }

  findChatParticipantsByUserId(userId: string): ChatParticipant[] {
    return Array.from(this.chatParticipants.values()).filter(
      (p) => p.userId === userId,
    );
  }

  findChatParticipantsByChatId(chatId: string): ChatParticipant[] {
    return Array.from(this.chatParticipants.values()).filter(
      (p) => p.chatId === chatId,
    );
  }

  findChatParticipant(chatId: string, userId: string): ChatParticipant | undefined {
    return Array.from(this.chatParticipants.values()).find(
      (p) => p.chatId === chatId && p.userId === userId,
    );
  }

  updateChatParticipant(id: string, data: Partial<ChatParticipant>): ChatParticipant | undefined {
    const participant = this.chatParticipants.get(id);
    if (!participant) return undefined;
    const updated = { ...participant, ...data };
    this.chatParticipants.set(id, updated);
    return updated;
  }

  createMessage(data: Omit<Message, 'id' | 'createdAt'>): Message {
    const message: Message = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
    };
    this.messages.set(message.id, message);
    return message;
  }

  findMessageById(id: string): Message | undefined {
    return this.messages.get(id);
  }

  findMessagesByChatId(chatId: string, limit = 50, before?: Date): Message[] {
    let msgs = Array.from(this.messages.values())
      .filter((m) => m.chatId === chatId);
    
    if (before) {
      msgs = msgs.filter((m) => m.createdAt < before);
    }
    
    return msgs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  updateMessage(id: string, data: Partial<Message>): Message | undefined {
    const message = this.messages.get(id);
    if (!message) return undefined;
    const updated = { ...message, ...data };
    this.messages.set(id, updated);
    return updated;
  }

  createLabel(data: Omit<Label, 'id' | 'createdAt' | 'updatedAt'>): Label {
    const label: Label = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.labels.set(label.id, label);
    return label;
  }

  findLabelById(id: string): Label | undefined {
    return this.labels.get(id);
  }

  findLabelsByUserId(userId: string): Label[] {
    return Array.from(this.labels.values()).filter((l) => l.userId === userId);
  }

  updateLabel(id: string, data: Partial<Label>): Label | undefined {
    const label = this.labels.get(id);
    if (!label) return undefined;
    const updated = { ...label, ...data, updatedAt: new Date() };
    this.labels.set(id, updated);
    return updated;
  }

  deleteLabel(id: string): boolean {
    Array.from(this.chatLabels.values())
      .filter((cl) => cl.labelId === id)
      .forEach((cl) => this.chatLabels.delete(cl.id));
    return this.labels.delete(id);
  }

  createChatLabel(data: Omit<ChatLabel, 'id' | 'createdAt'>): ChatLabel {
    const chatLabel: ChatLabel = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
    };
    this.chatLabels.set(chatLabel.id, chatLabel);
    return chatLabel;
  }

  findChatLabelsByChatId(chatId: string): ChatLabel[] {
    return Array.from(this.chatLabels.values()).filter(
      (cl) => cl.chatId === chatId,
    );
  }

  findChatsByLabelId(labelId: string): string[] {
    return Array.from(this.chatLabels.values())
      .filter((cl) => cl.labelId === labelId)
      .map((cl) => cl.chatId);
  }

  deleteChatLabel(chatId: string, labelId: string): boolean {
    const chatLabel = Array.from(this.chatLabels.values()).find(
      (cl) => cl.chatId === chatId && cl.labelId === labelId,
    );
    if (chatLabel) {
      return this.chatLabels.delete(chatLabel.id);
    }
    return false;
  }

  createQuickReply(data: Omit<QuickReply, 'id' | 'createdAt' | 'updatedAt'>): QuickReply {
    const quickReply: QuickReply = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.quickReplies.set(quickReply.id, quickReply);
    return quickReply;
  }

  findQuickReplyById(id: string): QuickReply | undefined {
    return this.quickReplies.get(id);
  }

  findQuickRepliesByUserId(userId: string): QuickReply[] {
    return Array.from(this.quickReplies.values()).filter(
      (qr) => qr.userId === userId,
    );
  }

  updateQuickReply(id: string, data: Partial<QuickReply>): QuickReply | undefined {
    const quickReply = this.quickReplies.get(id);
    if (!quickReply) return undefined;
    const updated = { ...quickReply, ...data, updatedAt: new Date() };
    this.quickReplies.set(id, updated);
    return updated;
  }

  deleteQuickReply(id: string): boolean {
    return this.quickReplies.delete(id);
  }

  createRefreshToken(data: Omit<RefreshToken, 'id' | 'createdAt'>): RefreshToken {
    const token: RefreshToken = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
    };
    this.refreshTokens.set(token.id, token);
    return token;
  }

  findRefreshTokenByHash(tokenHash: string): RefreshToken | undefined {
    return Array.from(this.refreshTokens.values()).find(
      (t) => t.tokenHash === tokenHash,
    );
  }

  deleteRefreshToken(id: string): boolean {
    return this.refreshTokens.delete(id);
  }

  deleteRefreshTokensByUserId(userId: string): void {
    Array.from(this.refreshTokens.values())
      .filter((t) => t.userId === userId)
      .forEach((t) => this.refreshTokens.delete(t.id));
  }

  createWebSession(data: Omit<WebSession, 'id' | 'createdAt'>): WebSession {
    const session: WebSession = {
      ...data,
      id: this.generateId(),
      createdAt: new Date(),
    };
    this.webSessions.set(session.id, session);
    return session;
  }

  findWebSessionByPairingCode(pairingCode: string): WebSession | undefined {
    return Array.from(this.webSessions.values()).find(
      (s) => s.pairingCode === pairingCode,
    );
  }

  updateWebSession(id: string, data: Partial<WebSession>): WebSession | undefined {
    const session = this.webSessions.get(id);
    if (!session) return undefined;
    const updated = { ...session, ...data };
    this.webSessions.set(id, updated);
    return updated;
  }

  deleteWebSession(id: string): boolean {
    return this.webSessions.delete(id);
  }

  getChatsForUser(userId: string): Array<Chat & { participants: ChatParticipant[]; lastMessage?: Message; labels: Label[] }> {
    const userParticipations = this.findChatParticipantsByUserId(userId);
    const chatIds = userParticipations.map((p) => p.chatId);
    
    return chatIds.map((chatId) => {
      const chat = this.findChatById(chatId);
      if (!chat) return null;
      
      const participants = this.findChatParticipantsByChatId(chatId);
      const messages = this.findMessagesByChatId(chatId, 1);
      const chatLabelIds = this.findChatLabelsByChatId(chatId).map((cl) => cl.labelId);
      const labels = chatLabelIds.map((id) => this.findLabelById(id)).filter((l): l is Label => l !== undefined);
      
      return {
        ...chat,
        participants,
        lastMessage: messages[0],
        labels,
      };
    }).filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => {
        const aTime = a.lastMessage?.createdAt.getTime() || a.createdAt.getTime();
        const bTime = b.lastMessage?.createdAt.getTime() || b.createdAt.getTime();
        return bTime - aTime;
      });
  }
}
