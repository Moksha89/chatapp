import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Like, In } from 'typeorm';
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
  ChatbotConfigEntity,
  OrderEntity,
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
  readReceiptsEnabled: boolean;
  blockedUsers: string[] | null;
  language: string;
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
  disappearingMessagesDuration: number | null;
  wallpaper: string | null;
  isLocked: boolean;
  pinnedMessageId: string | null;
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
  mediaUrl: string | null;
  mediaType: string | null;
  mediaName: string | null;
  mediaSize: number | null;
  mediaDuration: number | null;
  createdAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
  isStarred: boolean;
  forwardedFrom: string | null;
  replyToMessageId: string | null;
  reactions: { [emoji: string]: string[] } | null;
  isEdited: boolean;
  isDeleted: boolean;
  editedAt: Date | null;
  expiresAt: Date | null;
  isViewOnce: boolean;
  isViewed: boolean;
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
    @InjectRepository(ChatbotConfigEntity)
    private chatbotConfigRepository: Repository<ChatbotConfigEntity>,
    @InjectRepository(OrderEntity)
    private orderRepository: Repository<OrderEntity>,
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

  // Bug #9 fix: Batch fetch users by IDs in a single query
  async findUsersByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.userRepository.find({ where: { id: In(ids) } }) as Promise<User[]>;
  }

  // Bug #10 fix: Batch update messages to 'read' in a single query
  async markMessagesReadBatch(chatId: string, senderId: string, messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;
    await this.messageRepository
      .createQueryBuilder()
      .update()
      .set({ status: 'read', readAt: new Date() })
      .where('id IN (:...messageIds)', { messageIds })
      .andWhere('chatId = :chatId', { chatId })
      .andWhere('senderId != :senderId', { senderId })
      .execute();
  }

  // Bug #11 fix: Database LIKE query for searchByPhone instead of fetching all users
  async searchUsers(query: string): Promise<User[]> {
    if (!query.trim()) {
      return this.userRepository.find() as Promise<User[]>;
    }
    return this.userRepository.find({
      where: [
        { phoneNumber: Like(`%${query}%`) },
        { displayName: Like(`%${query}%`) },
      ],
    }) as Promise<User[]>;
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
    // Bug #10 fix: Single JOIN query instead of O(n²) loop
    const result = await this.chatRepository
      .createQueryBuilder('chat')
      .innerJoin('chat_participants', 'p1', 'p1."chatId" = chat.id AND p1."userId" = :userId1', { userId1 })
      .innerJoin('chat_participants', 'p2', 'p2."chatId" = chat.id AND p2."userId" = :userId2', { userId2 })
      .where('chat.type = :type', { type: 'direct' })
      .getOne();
    return (result as Chat) || undefined;
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

  async getChatsForUser(userId: string): Promise<Array<Chat & { participants: (ChatParticipant & { user?: { id: string; displayName: string; phoneNumber: string; profilePhoto: string | null } })[]; lastMessage?: Message; unreadCount: number; labels: Label[] }>> {
    const userParticipations = await this.findChatParticipantsByUserId(userId);
    const chatIds = userParticipations.map((p) => p.chatId);
    
    if (chatIds.length === 0) return [];

    // Batch fetch all chats in a single query
    const chats = await this.chatRepository.find({ where: { id: In(chatIds) } }) as Chat[];
    const chatMap = new Map(chats.map(c => [c.id, c]));

    // Batch fetch all participants for all chats in a single query
    const allParticipants = await this.chatParticipantRepository.find({ where: { chatId: In(chatIds) } }) as ChatParticipant[];
    const participantsByChatId = new Map<string, ChatParticipant[]>();
    const allUserIds = new Set<string>();
    for (const p of allParticipants) {
      if (!participantsByChatId.has(p.chatId)) participantsByChatId.set(p.chatId, []);
      participantsByChatId.get(p.chatId)!.push(p);
      allUserIds.add(p.userId);
    }

    // Batch fetch all users referenced by participants in a single query
    const allUsers = await this.findUsersByIds(Array.from(allUserIds));
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    // Batch fetch last message per chat using a single query per chat (unavoidable for ORDER BY + LIMIT 1)
    // But we can parallelize them
    const lastMessagesPromises = chatIds.map(chatId => 
      this.findMessagesByChatId(chatId, 1).then(msgs => ({ chatId, message: msgs[0] }))
    );
    const lastMessagesResults = await Promise.all(lastMessagesPromises);
    const lastMessageMap = new Map(lastMessagesResults.map(r => [r.chatId, r.message]));

    // Batch count unread messages using a single COUNT query per chat (parallelized)
    const userParticipantsMap = new Map(allParticipants.filter(p => p.userId === userId).map(p => [p.chatId, p]));
    const unreadCountPromises = chatIds.map(async (chatId) => {
      const userParticipant = userParticipantsMap.get(chatId);
      if (!userParticipant) return { chatId, count: 0 };
      const qb = this.messageRepository.createQueryBuilder('msg')
        .where('msg."chatId" = :chatId', { chatId })
        .andWhere('msg."senderId" != :userId', { userId });
      qb.andWhere('msg.status != :readStatus', { readStatus: 'read' });
      if (userParticipant.lastReadAt) {
        qb.andWhere('msg."createdAt" > :lastReadAt', { lastReadAt: userParticipant.lastReadAt });
      }
      const count = await qb.getCount();
      return { chatId, count };
    });
    const unreadResults = await Promise.all(unreadCountPromises);
    const unreadMap = new Map(unreadResults.map(r => [r.chatId, r.count]));

    // Batch fetch all chat labels in a single query
    const allChatLabels = await this.chatLabelRepository.find({ where: { chatId: In(chatIds) } }) as ChatLabel[];
    const labelIdsByChatId = new Map<string, string[]>();
    const allLabelIds = new Set<string>();
    for (const cl of allChatLabels) {
      if (!labelIdsByChatId.has(cl.chatId)) labelIdsByChatId.set(cl.chatId, []);
      labelIdsByChatId.get(cl.chatId)!.push(cl.labelId);
      allLabelIds.add(cl.labelId);
    }

    // Batch fetch all labels in a single query
    const allLabels = allLabelIds.size > 0 
      ? await this.labelRepository.find({ where: { id: In(Array.from(allLabelIds)) } }) as Label[]
      : [];
    const labelMap = new Map(allLabels.map(l => [l.id, l]));

    // Assemble results
    const results: Array<Chat & { participants: (ChatParticipant & { user?: { id: string; displayName: string; phoneNumber: string; profilePhoto: string | null } })[]; lastMessage?: Message; unreadCount: number; labels: Label[] }> = [];

    for (const chatId of chatIds) {
      const chat = chatMap.get(chatId);
      if (!chat) continue;

      const participants = participantsByChatId.get(chatId) || [];
      const enrichedParticipants = participants.map(p => {
        const u = userMap.get(p.userId);
        return {
          ...p,
          user: u ? { id: u.id, displayName: u.displayName, phoneNumber: u.phoneNumber, profilePhoto: u.profilePhoto } : undefined,
        };
      });

      const chatLabelIds = labelIdsByChatId.get(chatId) || [];
      const labels = chatLabelIds.map(lid => labelMap.get(lid)).filter((l): l is Label => !!l);

      results.push({
        ...chat,
        participants: enrichedParticipants,
        lastMessage: lastMessageMap.get(chatId),
        unreadCount: unreadMap.get(chatId) || 0,
        labels,
      });
    }
    
    return results.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt.getTime() || a.createdAt.getTime();
      const bTime = b.lastMessage?.createdAt.getTime() || b.createdAt.getTime();
      return bTime - aTime;
    });
  }

  // Search messages across all chats for a user
  async searchMessages(userId: string, query: string, limit = 50): Promise<Message[]> {
    const participations = await this.chatParticipantRepository.find({ where: { userId } });
    const chatIds = participations.map(p => p.chatId);
    
    if (chatIds.length === 0) return [];
    
    return this.messageRepository.find({
      where: {
        chatId: In(chatIds),
        content: Like(`%${query}%`),
      },
      order: { createdAt: 'DESC' },
      take: limit,
    }) as Promise<Message[]>;
  }

  // Get starred messages for a user
  async getStarredMessages(userId: string): Promise<Message[]> {
    const participations = await this.chatParticipantRepository.find({ where: { userId } });
    const chatIds = participations.map(p => p.chatId);
    
    if (chatIds.length === 0) return [];
    
    return this.messageRepository.find({
      where: {
        chatId: In(chatIds),
        isStarred: true,
      },
      order: { createdAt: 'DESC' },
    }) as Promise<Message[]>;
  }

  // Toggle message star
  async toggleMessageStar(messageId: string): Promise<Message | undefined> {
    const message = await this.findMessageById(messageId);
    if (!message) return undefined;
    
    await this.messageRepository.update(messageId, { isStarred: !message.isStarred });
    return this.findMessageById(messageId);
  }

  // Delete expired messages (for disappearing messages feature)
  async deleteExpiredMessages(): Promise<number> {
    const result = await this.messageRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }

  // Get messages for export
  async getMessagesForExport(chatId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: { chatId },
      order: { createdAt: 'ASC' },
    }) as Promise<Message[]>;
  }

  // Chatbot config CRUD (Bug #1 fix: persisted to DB)
  async findChatbotConfig(chatId: string): Promise<ChatbotConfigEntity | undefined> {
    const config = await this.chatbotConfigRepository.findOne({ where: { chatId } });
    return config || undefined;
  }

  async saveChatbotConfig(chatId: string, enabled: boolean, rules: Array<{ trigger: string; response: string }>): Promise<ChatbotConfigEntity> {
    let config = await this.chatbotConfigRepository.findOne({ where: { chatId } });
    if (config) {
      config.enabled = enabled;
      config.rules = JSON.stringify(rules);
      return this.chatbotConfigRepository.save(config);
    }
    config = this.chatbotConfigRepository.create({
      chatId,
      enabled,
      rules: JSON.stringify(rules),
    });
    return this.chatbotConfigRepository.save(config);
  }

  // Order CRUD (Bug #1 fix: persisted to DB)
  async createOrder(data: { chatId: string; userId: string; items: string; total: number; status: string }): Promise<OrderEntity> {
    const order = this.orderRepository.create(data);
    return this.orderRepository.save(order);
  }

  async findOrderById(id: string): Promise<OrderEntity | undefined> {
    const order = await this.orderRepository.findOne({ where: { id } });
    return order || undefined;
  }

  async findOrdersByChatId(chatId: string): Promise<OrderEntity[]> {
    return this.orderRepository.find({ where: { chatId }, order: { createdAt: 'DESC' } });
  }

  async updateOrderStatus(id: string, status: string): Promise<OrderEntity | undefined> {
    await this.orderRepository.update(id, { status });
    return this.findOrderById(id);
  }
}
