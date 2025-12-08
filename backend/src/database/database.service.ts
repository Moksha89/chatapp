import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  UserEntity,
  DeviceEntity,
  ChatEntity,
  ChatParticipantEntity,
  MessageEntity,
  LabelEntity,
  ChatLabelEntity,
  BusinessProfileEntity,
  ContactEntity,
  QuickReplyEntity,
  OneTimePrekeyEntity,
  RefreshTokenEntity,
  WebSessionEntity,
} from './entities';

export interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
  profilePhoto: string | null;
  isBusiness: boolean;
  status: string | null;
  lastSeen: Date | null;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Device {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
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
  type: string;
  name: string | null;
  description: string | null;
  iconUrl: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatParticipant {
  id: string;
  chatId: string;
  userId: string;
  role: string;
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
  type: string;
  status: string;
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
  status: string;
  expiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(DeviceEntity)
    private deviceRepository: Repository<DeviceEntity>,
    @InjectRepository(ChatEntity)
    private chatRepository: Repository<ChatEntity>,
    @InjectRepository(ChatParticipantEntity)
    private chatParticipantRepository: Repository<ChatParticipantEntity>,
    @InjectRepository(MessageEntity)
    private messageRepository: Repository<MessageEntity>,
    @InjectRepository(LabelEntity)
    private labelRepository: Repository<LabelEntity>,
    @InjectRepository(ChatLabelEntity)
    private chatLabelRepository: Repository<ChatLabelEntity>,
    @InjectRepository(BusinessProfileEntity)
    private businessProfileRepository: Repository<BusinessProfileEntity>,
    @InjectRepository(ContactEntity)
    private contactRepository: Repository<ContactEntity>,
    @InjectRepository(QuickReplyEntity)
    private quickReplyRepository: Repository<QuickReplyEntity>,
    @InjectRepository(OneTimePrekeyEntity)
    private oneTimePrekeyRepository: Repository<OneTimePrekeyEntity>,
    @InjectRepository(RefreshTokenEntity)
    private refreshTokenRepository: Repository<RefreshTokenEntity>,
    @InjectRepository(WebSessionEntity)
    private webSessionRepository: Repository<WebSessionEntity>,
  ) {}

  async onModuleInit() {
    console.log('DatabaseService initialized with TypeORM');
  }

  generateId(): string {
    return uuidv4();
  }

  async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user = this.userRepository.create({
      ...data,
      id: this.generateId(),
    });
    return this.userRepository.save(user) as Promise<User>;
  }

  async findUserById(id: string): Promise<User | undefined> {
    const user = await this.userRepository.findOne({ where: { id } });
    return user || undefined;
  }

  async findUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const user = await this.userRepository.findOne({ where: { phoneNumber } });
    return user || undefined;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    await this.userRepository.update(id, data);
    return this.findUserById(id);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find() as Promise<User[]>;
  }

  async createDevice(data: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>): Promise<Device> {
    const device = this.deviceRepository.create({
      ...data,
      id: this.generateId(),
    });
    return this.deviceRepository.save(device) as Promise<Device>;
  }

  async findDeviceById(id: string): Promise<Device | undefined> {
    const device = await this.deviceRepository.findOne({ where: { id } });
    return device || undefined;
  }

  async findDevicesByUserId(userId: string): Promise<Device[]> {
    return this.deviceRepository.find({ where: { userId } }) as Promise<Device[]>;
  }

  async findDeviceByUserAndDeviceId(userId: string, deviceId: string): Promise<Device | undefined> {
    const device = await this.deviceRepository.findOne({ where: { userId, deviceId } });
    return device || undefined;
  }

  async updateDevice(id: string, data: Partial<Device>): Promise<Device | undefined> {
    await this.deviceRepository.update(id, data);
    return this.findDeviceById(id);
  }

  async deleteDevice(id: string): Promise<boolean> {
    const result = await this.deviceRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async createOneTimePrekey(data: Omit<OneTimePrekey, 'id' | 'createdAt'>): Promise<OneTimePrekey> {
    const prekey = this.oneTimePrekeyRepository.create({
      ...data,
      id: this.generateId(),
    });
    return this.oneTimePrekeyRepository.save(prekey) as Promise<OneTimePrekey>;
  }

  async findUnusedPrekeyByDeviceId(deviceId: string): Promise<OneTimePrekey | undefined> {
    const prekey = await this.oneTimePrekeyRepository.findOne({
      where: { deviceId, isUsed: false },
    });
    return prekey || undefined;
  }

  async markPrekeyAsUsed(id: string): Promise<void> {
    await this.oneTimePrekeyRepository.update(id, { isUsed: true });
  }

  async countUnusedPrekeysByDeviceId(deviceId: string): Promise<number> {
    return this.oneTimePrekeyRepository.count({
      where: { deviceId, isUsed: false },
    });
  }

  async createBusinessProfile(data: Omit<BusinessProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessProfile> {
    const profile = this.businessProfileRepository.create({
      ...data,
      id: this.generateId(),
    });
    return this.businessProfileRepository.save(profile) as Promise<BusinessProfile>;
  }

  async findBusinessProfileByUserId(userId: string): Promise<BusinessProfile | undefined> {
    const profile = await this.businessProfileRepository.findOne({ where: { userId } });
    return profile || undefined;
  }

  async updateBusinessProfile(id: string, data: Partial<BusinessProfile>): Promise<BusinessProfile | undefined> {
    await this.businessProfileRepository.update(id, data);
    const profile = await this.businessProfileRepository.findOne({ where: { id } });
    return profile || undefined;
  }

  async createContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    const contact = this.contactRepository.create({
      ...data,
      id: this.generateId(),
    });
    return this.contactRepository.save(contact) as Promise<Contact>;
  }

  async findContactById(id: string): Promise<Contact | undefined> {
    const contact = await this.contactRepository.findOne({ where: { id } });
    return contact || undefined;
  }

  async findContactsByOwnerId(ownerId: string): Promise<Contact[]> {
    return this.contactRepository.find({ where: { ownerId } }) as Promise<Contact[]>;
  }

  async updateContact(id: string, data: Partial<Contact>): Promise<Contact | undefined> {
    await this.contactRepository.update(id, data);
    return this.findContactById(id);
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await this.contactRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async createChat(data: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chat> {
    const chat = this.chatRepository.create({
      ...data,
      id: this.generateId(),
    });
    return this.chatRepository.save(chat) as Promise<Chat>;
  }

  async findChatById(id: string): Promise<Chat | undefined> {
    const chat = await this.chatRepository.findOne({ where: { id } });
    return chat || undefined;
  }

  async findDirectChatBetweenUsers(userId1: string, userId2: string): Promise<Chat | undefined> {
    const chats = await this.chatRepository.find({ where: { type: 'direct' } });
    
    for (const chat of chats) {
      const participants = await this.chatParticipantRepository.find({
        where: { chatId: chat.id },
      });
      if (participants.length === 2) {
        const userIds = participants.map((p) => p.userId);
        if (userIds.includes(userId1) && userIds.includes(userId2)) {
          return chat as Chat;
        }
      }
    }
    return undefined;
  }

  async updateChat(id: string, data: Partial<Chat>): Promise<Chat | undefined> {
    await this.chatRepository.update(id, data);
    return this.findChatById(id);
  }

  async createChatParticipant(data: Omit<ChatParticipant, 'id'>): Promise<ChatParticipant> {
    const participant = this.chatParticipantRepository.create({
      ...data,
      id: this.generateId(),
    });
    return this.chatParticipantRepository.save(participant) as Promise<ChatParticipant>;
  }

  async findChatParticipantsByUserId(userId: string): Promise<ChatParticipant[]> {
    return this.chatParticipantRepository.find({ where: { userId } }) as Promise<ChatParticipant[]>;
  }

  async findChatParticipantsByChatId(chatId: string): Promise<ChatParticipant[]> {
    return this.chatParticipantRepository.find({ where: { chatId } }) as Promise<ChatParticipant[]>;
  }

  async findChatParticipant(chatId: string, userId: string): Promise<ChatParticipant | undefined> {
    const participant = await this.chatParticipantRepository.findOne({
      where: { chatId, userId },
    });
    return participant || undefined;
  }

  async updateChatParticipant(id: string, data: Partial<ChatParticipant>): Promise<ChatParticipant | undefined> {
    await this.chatParticipantRepository.update(id, data);
    const participant = await this.chatParticipantRepository.findOne({ where: { id } });
    return participant || undefined;
  }

  async deleteChatParticipant(id: string): Promise<boolean> {
    const result = await this.chatParticipantRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async createMessage(data: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    const message = this.messageRepository.create({
      ...data,
      id: this.generateId(),
    });
    return this.messageRepository.save(message) as Promise<Message>;
  }

  async findMessageById(id: string): Promise<Message | undefined> {
    const message = await this.messageRepository.findOne({ where: { id } });
    return message || undefined;
  }

  async findMessagesByChatId(chatId: string, limit = 50, before?: Date): Promise<Message[]> {
    const whereClause: Record<string, unknown> = { chatId };
    if (before) {
      whereClause.createdAt = LessThan(before);
    }
    
    return this.messageRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
      take: limit,
    }) as Promise<Message[]>;
  }

  async updateMessage(id: string, data: Partial<Message>): Promise<Message | undefined> {
    await this.messageRepository.update(id, data);
    return this.findMessageById(id);
  }

  async createLabel(data: Omit<Label, 'id' | 'createdAt' | 'updatedAt'>): Promise<Label> {
    const label = this.labelRepository.create({
      ...data,
      id: this.generateId(),
    });
    return this.labelRepository.save(label) as Promise<Label>;
  }

  async findLabelById(id: string): Promise<Label | undefined> {
    const label = await this.labelRepository.findOne({ where: { id } });
    return label || undefined;
  }

  async findLabelsByUserId(userId: string): Promise<Label[]> {
    return this.labelRepository.find({ where: { userId } }) as Promise<Label[]>;
  }

  async updateLabel(id: string, data: Partial<Label>): Promise<Label | undefined> {
    await this.labelRepository.update(id, data);
    return this.findLabelById(id);
  }

  async deleteLabel(id: string): Promise<boolean> {
    await this.chatLabelRepository.delete({ labelId: id });
    const result = await this.labelRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async createChatLabel(data: Omit<ChatLabel, 'id' | 'createdAt'>): Promise<ChatLabel> {
    const chatLabel = this.chatLabelRepository.create({
      ...data,
      id: this.generateId(),
    });
    return this.chatLabelRepository.save(chatLabel) as Promise<ChatLabel>;
  }

  async findChatLabelsByChatId(chatId: string): Promise<ChatLabel[]> {
    return this.chatLabelRepository.find({ where: { chatId } }) as Promise<ChatLabel[]>;
  }

  async findChatsByLabelId(labelId: string): Promise<string[]> {
    const chatLabels = await this.chatLabelRepository.find({ where: { labelId } });
    return chatLabels.map((cl) => cl.chatId);
  }

  async deleteChatLabel(chatId: string, labelId: string): Promise<boolean> {
    const result = await this.chatLabelRepository.delete({ chatId, labelId });
    return (result.affected ?? 0) > 0;
  }

  async createQuickReply(data: Omit<QuickReply, 'id' | 'createdAt' | 'updatedAt'>): Promise<QuickReply> {
    const quickReply = this.quickReplyRepository.create({
      ...data,
      id: this.generateId(),
    });
    return this.quickReplyRepository.save(quickReply) as Promise<QuickReply>;
  }

  async findQuickReplyById(id: string): Promise<QuickReply | undefined> {
    const quickReply = await this.quickReplyRepository.findOne({ where: { id } });
    return quickReply || undefined;
  }

  async findQuickRepliesByUserId(userId: string): Promise<QuickReply[]> {
    return this.quickReplyRepository.find({ where: { userId } }) as Promise<QuickReply[]>;
  }

  async updateQuickReply(id: string, data: Partial<QuickReply>): Promise<QuickReply | undefined> {
    await this.quickReplyRepository.update(id, data);
    return this.findQuickReplyById(id);
  }

  async deleteQuickReply(id: string): Promise<boolean> {
    const result = await this.quickReplyRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async createRefreshToken(data: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken> {
    const token = this.refreshTokenRepository.create({
      ...data,
      id: this.generateId(),
    });
    return this.refreshTokenRepository.save(token) as Promise<RefreshToken>;
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | undefined> {
    const token = await this.refreshTokenRepository.findOne({ where: { tokenHash } });
    return token || undefined;
  }

  async deleteRefreshToken(id: string): Promise<boolean> {
    const result = await this.refreshTokenRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async deleteRefreshTokensByUserId(userId: string): Promise<void> {
    await this.refreshTokenRepository.delete({ userId });
  }

  async createWebSession(data: Omit<WebSession, 'id' | 'createdAt'>): Promise<WebSession> {
    const session = this.webSessionRepository.create({
      ...data,
      id: this.generateId(),
    });
    return this.webSessionRepository.save(session) as Promise<WebSession>;
  }

  async findWebSessionByPairingCode(pairingCode: string): Promise<WebSession | undefined> {
    const session = await this.webSessionRepository.findOne({ where: { pairingCode } });
    return session || undefined;
  }

  async updateWebSession(id: string, data: Partial<WebSession>): Promise<WebSession | undefined> {
    await this.webSessionRepository.update(id, data);
    const session = await this.webSessionRepository.findOne({ where: { id } });
    return session || undefined;
  }

  async deleteWebSession(id: string): Promise<boolean> {
    const result = await this.webSessionRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async getChatsForUser(userId: string): Promise<Array<Chat & { participants: ChatParticipant[]; lastMessage?: Message; labels: Label[] }>> {
    const userParticipations = await this.findChatParticipantsByUserId(userId);
    const chatIds = userParticipations.map((p) => p.chatId);
    
    const results: Array<Chat & { participants: ChatParticipant[]; lastMessage?: Message; labels: Label[] }> = [];
    
    for (const chatId of chatIds) {
      const chat = await this.findChatById(chatId);
      if (!chat) continue;
      
      const participants = await this.findChatParticipantsByChatId(chatId);
      const messages = await this.findMessagesByChatId(chatId, 1);
      const chatLabelIds = (await this.findChatLabelsByChatId(chatId)).map((cl) => cl.labelId);
      const labels: Label[] = [];
      
      for (const labelId of chatLabelIds) {
        const label = await this.findLabelById(labelId);
        if (label) labels.push(label);
      }
      
      results.push({
        ...chat,
        participants,
        lastMessage: messages[0],
        labels,
      });
    }
    
    return results.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt.getTime() || a.createdAt.getTime();
      const bTime = b.lastMessage?.createdAt.getTime() || b.createdAt.getTime();
      return bTime - aTime;
    });
  }
}
