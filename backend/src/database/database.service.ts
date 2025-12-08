import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

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
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
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

  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly SAVE_DEBOUNCE_MS = 1000;

  onModuleInit() {
    this.loadFromDisk();
  }

  onModuleDestroy() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveToDiskSync();
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        
        const parseDate = (obj: Record<string, unknown>) => {
          for (const key of Object.keys(obj)) {
            if (typeof obj[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj[key] as string)) {
              obj[key] = new Date(obj[key] as string);
            }
          }
          return obj;
        };

        if (data.users) {
          data.users.forEach((u: User) => this.users.set(u.id, parseDate(u as unknown as Record<string, unknown>) as unknown as User));
        }
        if (data.devices) {
          data.devices.forEach((d: Device) => this.devices.set(d.id, parseDate(d as unknown as Record<string, unknown>) as unknown as Device));
        }
        if (data.oneTimePrekeys) {
          data.oneTimePrekeys.forEach((p: OneTimePrekey) => this.oneTimePrekeys.set(p.id, parseDate(p as unknown as Record<string, unknown>) as unknown as OneTimePrekey));
        }
        if (data.businessProfiles) {
          data.businessProfiles.forEach((p: BusinessProfile) => this.businessProfiles.set(p.id, parseDate(p as unknown as Record<string, unknown>) as unknown as BusinessProfile));
        }
        if (data.contacts) {
          data.contacts.forEach((c: Contact) => this.contacts.set(c.id, parseDate(c as unknown as Record<string, unknown>) as unknown as Contact));
        }
        if (data.chats) {
          data.chats.forEach((c: Chat) => this.chats.set(c.id, parseDate(c as unknown as Record<string, unknown>) as unknown as Chat));
        }
        if (data.chatParticipants) {
          data.chatParticipants.forEach((p: ChatParticipant) => this.chatParticipants.set(p.id, parseDate(p as unknown as Record<string, unknown>) as unknown as ChatParticipant));
        }
        if (data.messages) {
          data.messages.forEach((m: Message) => this.messages.set(m.id, parseDate(m as unknown as Record<string, unknown>) as unknown as Message));
        }
        if (data.labels) {
          data.labels.forEach((l: Label) => this.labels.set(l.id, parseDate(l as unknown as Record<string, unknown>) as unknown as Label));
        }
        if (data.chatLabels) {
          data.chatLabels.forEach((cl: ChatLabel) => this.chatLabels.set(cl.id, parseDate(cl as unknown as Record<string, unknown>) as unknown as ChatLabel));
        }
        if (data.quickReplies) {
          data.quickReplies.forEach((qr: QuickReply) => this.quickReplies.set(qr.id, parseDate(qr as unknown as Record<string, unknown>) as unknown as QuickReply));
        }
        if (data.refreshTokens) {
          data.refreshTokens.forEach((t: RefreshToken) => this.refreshTokens.set(t.id, parseDate(t as unknown as Record<string, unknown>) as unknown as RefreshToken));
        }
        if (data.webSessions) {
          data.webSessions.forEach((s: WebSession) => this.webSessions.set(s.id, parseDate(s as unknown as Record<string, unknown>) as unknown as WebSession));
        }

        console.log('Database loaded from disk');
      }
    } catch (error) {
      console.error('Failed to load database from disk:', error);
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToDiskSync();
    }, this.SAVE_DEBOUNCE_MS);
  }

  private saveToDiskSync() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      const data = {
        users: Array.from(this.users.values()),
        devices: Array.from(this.devices.values()),
        oneTimePrekeys: Array.from(this.oneTimePrekeys.values()),
        businessProfiles: Array.from(this.businessProfiles.values()),
        contacts: Array.from(this.contacts.values()),
        chats: Array.from(this.chats.values()),
        chatParticipants: Array.from(this.chatParticipants.values()),
        messages: Array.from(this.messages.values()),
        labels: Array.from(this.labels.values()),
        chatLabels: Array.from(this.chatLabels.values()),
        quickReplies: Array.from(this.quickReplies.values()),
        refreshTokens: Array.from(this.refreshTokens.values()),
        webSessions: Array.from(this.webSessions.values()),
      };

      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      console.log('Database saved to disk');
    } catch (error) {
      console.error('Failed to save database to disk:', error);
    }
  }

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
      this.scheduleSave();
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
      this.scheduleSave();
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
      this.scheduleSave();
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
      this.scheduleSave();
      return updated;
    }

    deleteDevice(id: string): boolean {
      const result = this.devices.delete(id);
      if (result) this.scheduleSave();
      return result;
    }

    createOneTimePrekey(data: Omit<OneTimePrekey, 'id' | 'createdAt'>): OneTimePrekey {
      const prekey: OneTimePrekey = {
        ...data,
        id: this.generateId(),
        createdAt: new Date(),
      };
      this.oneTimePrekeys.set(prekey.id, prekey);
      this.scheduleSave();
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
        this.scheduleSave();
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
      this.scheduleSave();
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
      this.scheduleSave();
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
      this.scheduleSave();
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
      this.scheduleSave();
      return updated;
    }

    deleteContact(id: string): boolean {
      const result = this.contacts.delete(id);
      if (result) this.scheduleSave();
      return result;
    }

    createChat(data: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>): Chat {
      const chat: Chat = {
        ...data,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.chats.set(chat.id, chat);
      this.scheduleSave();
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
      this.scheduleSave();
      return updated;
    }

    createChatParticipant(data: Omit<ChatParticipant, 'id'>): ChatParticipant {
      const participant: ChatParticipant = {
        ...data,
        id: this.generateId(),
      };
      this.chatParticipants.set(participant.id, participant);
      this.scheduleSave();
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
      this.scheduleSave();
      return updated;
    }

    createMessage(data: Omit<Message, 'id' | 'createdAt'>): Message {
      const message: Message = {
        ...data,
        id: this.generateId(),
        createdAt: new Date(),
      };
      this.messages.set(message.id, message);
      this.scheduleSave();
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
      this.scheduleSave();
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
      this.scheduleSave();
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
      this.scheduleSave();
      return updated;
    }

    deleteLabel(id: string): boolean {
      Array.from(this.chatLabels.values())
        .filter((cl) => cl.labelId === id)
        .forEach((cl) => this.chatLabels.delete(cl.id));
      const result = this.labels.delete(id);
      if (result) this.scheduleSave();
      return result;
    }

    createChatLabel(data: Omit<ChatLabel, 'id' | 'createdAt'>): ChatLabel {
      const chatLabel: ChatLabel = {
        ...data,
        id: this.generateId(),
        createdAt: new Date(),
      };
      this.chatLabels.set(chatLabel.id, chatLabel);
      this.scheduleSave();
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
        const result = this.chatLabels.delete(chatLabel.id);
        if (result) this.scheduleSave();
        return result;
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
      this.scheduleSave();
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
      this.scheduleSave();
      return updated;
    }

    deleteQuickReply(id: string): boolean {
      const result = this.quickReplies.delete(id);
      if (result) this.scheduleSave();
      return result;
    }

    createRefreshToken(data: Omit<RefreshToken, 'id' | 'createdAt'>): RefreshToken {
      const token: RefreshToken = {
        ...data,
        id: this.generateId(),
        createdAt: new Date(),
      };
      this.refreshTokens.set(token.id, token);
      this.scheduleSave();
      return token;
    }

  findRefreshTokenByHash(tokenHash: string): RefreshToken | undefined {
    return Array.from(this.refreshTokens.values()).find(
      (t) => t.tokenHash === tokenHash,
    );
  }

    deleteRefreshToken(id: string): boolean {
      const result = this.refreshTokens.delete(id);
      if (result) this.scheduleSave();
      return result;
    }

    deleteRefreshTokensByUserId(userId: string): void {
      const tokens = Array.from(this.refreshTokens.values())
        .filter((t) => t.userId === userId);
      tokens.forEach((t) => this.refreshTokens.delete(t.id));
      if (tokens.length > 0) this.scheduleSave();
    }

    createWebSession(data: Omit<WebSession, 'id' | 'createdAt'>): WebSession {
      const session: WebSession = {
        ...data,
        id: this.generateId(),
        createdAt: new Date(),
      };
      this.webSessions.set(session.id, session);
      this.scheduleSave();
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
      this.scheduleSave();
      return updated;
    }

    deleteWebSession(id: string): boolean {
      const result = this.webSessions.delete(id);
      if (result) this.scheduleSave();
      return result;
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
