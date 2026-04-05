import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import {
  UserEntity,
  DeviceEntity,
  ChatEntity,
  ChatParticipantEntity,
  MessageEntity,
  LabelEntity,
  BusinessProfileEntity,
  QuickReplyEntity,
  RefreshTokenEntity,
  ChatbotConfigEntity,
  OrderEntity,
  StickerEntity,
  FaqEntity,
} from '../database/entities';
import { AuditLogEntity } from './audit-log.entity';
import * as os from 'os';
import * as bcrypt from 'bcrypt';

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  role: 'super_admin' | 'moderator' | 'viewer';
  createdAt: Date;
}

@Injectable()
export class AdminService {
  // In-memory admin users (in production, store in DB)
  private adminUsers: AdminUser[] = [
    {
      id: 'admin-1',
      username: 'admin',
      passwordHash: '', // Set on init
      role: 'super_admin',
      createdAt: new Date(),
    },
  ];

  constructor(
    private readonly databaseService: DatabaseService,
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
    @InjectRepository(BusinessProfileEntity)
    private businessProfileRepository: Repository<BusinessProfileEntity>,
    @InjectRepository(QuickReplyEntity)
    private quickReplyRepository: Repository<QuickReplyEntity>,
    @InjectRepository(RefreshTokenEntity)
    private refreshTokenRepository: Repository<RefreshTokenEntity>,
    @InjectRepository(ChatbotConfigEntity)
    private chatbotConfigRepository: Repository<ChatbotConfigEntity>,
    @InjectRepository(OrderEntity)
    private orderRepository: Repository<OrderEntity>,
    @InjectRepository(AuditLogEntity)
    private auditLogRepository: Repository<AuditLogEntity>,
    @InjectRepository(StickerEntity)
    private stickerRepository: Repository<StickerEntity>,
    @InjectRepository(FaqEntity)
    private faqRepository: Repository<FaqEntity>,
  ) {
    this.initDefaultAdmin();
  }

  private async initDefaultAdmin(): Promise<void> {
    const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
    this.adminUsers[0].passwordHash = await bcrypt.hash(password, 10);
  }

  // ========== AUTH ==========
  async validateAdmin(username: string, password: string): Promise<AdminUser | null> {
    const admin = this.adminUsers.find(a => a.username === username);
    if (!admin) return null;
    const isValid = await bcrypt.compare(password, admin.passwordHash);
    return isValid ? admin : null;
  }

  // ========== DASHBOARD ==========
  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalMessages: number;
    totalChats: number;
    totalGroups: number;
    totalChannels: number;
    totalOrders: number;
    totalDevices: number;
    activeUsersToday: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    serverHealth: {
      cpuUsage: number;
      memoryUsage: number;
      memoryTotal: number;
      memoryFree: number;
      uptime: number;
      platform: string;
      hostname: string;
    };
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setMonth(monthStart.getMonth() - 1);

    const [
      totalUsers,
      totalMessages,
      totalChats,
      totalGroups,
      totalChannels,
      totalOrders,
      totalDevices,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
    ] = await Promise.all([
      this.userRepository.count(),
      this.messageRepository.count(),
      this.chatRepository.count(),
      this.chatRepository.count({ where: { type: 'group' } }),
      this.chatRepository.count({ where: { type: 'channel' } }),
      this.orderRepository.count(),
      this.deviceRepository.count(),
      this.userRepository.count({ where: { createdAt: MoreThan(todayStart) } }),
      this.userRepository.count({ where: { createdAt: MoreThan(weekStart) } }),
      this.userRepository.count({ where: { createdAt: MoreThan(monthStart) } }),
    ]);

    // Active users today = users with lastSeen today
    const activeUsersToday = await this.userRepository.count({
      where: { lastSeen: MoreThan(todayStart) },
    });

    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    return {
      totalUsers,
      totalMessages,
      totalChats,
      totalGroups,
      totalChannels,
      totalOrders,
      totalDevices,
      activeUsersToday,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      serverHealth: {
        cpuUsage: cpus.length > 0 ? Math.round(
          cpus.reduce((acc, cpu) => {
            const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
            return acc + ((total - cpu.times.idle) / total) * 100;
          }, 0) / cpus.length
        ) : 0,
        memoryUsage: Math.round(((totalMem - freeMem) / totalMem) * 100),
        memoryTotal: Math.round(totalMem / (1024 * 1024 * 1024) * 100) / 100,
        memoryFree: Math.round(freeMem / (1024 * 1024 * 1024) * 100) / 100,
        uptime: os.uptime(),
        platform: os.platform(),
        hostname: os.hostname(),
      },
    };
  }

  async getAnalyticsData(days = 30): Promise<{
    userGrowth: Array<{ date: string; count: number }>;
    messageVolume: Array<{ date: string; count: number }>;
    deviceBreakdown: Array<{ type: string; count: number }>;
  }> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    // User growth
    const users = await this.userRepository.find({
      where: { createdAt: MoreThan(startDate) },
      order: { createdAt: 'ASC' },
    });

    const userGrowthMap = new Map<string, number>();
    for (const user of users) {
      const date = user.createdAt.toISOString().split('T')[0];
      userGrowthMap.set(date, (userGrowthMap.get(date) || 0) + 1);
    }
    const userGrowth = Array.from(userGrowthMap.entries()).map(([date, count]) => ({ date, count }));

    // Message volume
    const messages = await this.messageRepository.find({
      where: { createdAt: MoreThan(startDate) },
      order: { createdAt: 'ASC' },
    });

    const messageVolumeMap = new Map<string, number>();
    for (const msg of messages) {
      const date = msg.createdAt.toISOString().split('T')[0];
      messageVolumeMap.set(date, (messageVolumeMap.get(date) || 0) + 1);
    }
    const messageVolume = Array.from(messageVolumeMap.entries()).map(([date, count]) => ({ date, count }));

    // Device breakdown
    const devices = await this.deviceRepository.find();
    const deviceMap = new Map<string, number>();
    for (const device of devices) {
      const type = device.deviceType || 'unknown';
      deviceMap.set(type, (deviceMap.get(type) || 0) + 1);
    }
    const deviceBreakdown = Array.from(deviceMap.entries()).map(([type, count]) => ({ type, count }));

    return { userGrowth, messageVolume, deviceBreakdown };
  }

  // ========== USER MANAGEMENT ==========
  async getUsers(page = 1, limit = 20, search?: string): Promise<{
    users: UserEntity[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    let queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder = queryBuilder.where(
        'user.phoneNumber ILIKE :search OR user.displayName ILIKE :search',
        { search: `%${search}%` },
      );
    }

    const [users, total] = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserDetail(userId: string): Promise<{
    user: UserEntity | null;
    devices: DeviceEntity[];
    chats: number;
    messages: number;
    businessProfile: BusinessProfileEntity | null;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const devices = await this.deviceRepository.find({ where: { userId } });
    const participations = await this.chatParticipantRepository.find({ where: { userId } });
    const messages = await this.messageRepository.count({ where: { senderId: userId } });
    const businessProfile = await this.businessProfileRepository.findOne({ where: { userId } });

    return {
      user,
      devices,
      chats: participations.length,
      messages,
      businessProfile,
    };
  }

  async deleteUser(userId: string): Promise<boolean> {
    // Delete related data
    await this.refreshTokenRepository.delete({ userId });
    await this.deviceRepository.delete({ userId });
    const result = await this.userRepository.delete(userId);
    return (result.affected ?? 0) > 0;
  }

  async toggleBlockUser(userId: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return null;
    // Use status field to mark blocked
    const isBlocked = user.status === '__BLOCKED__';
    user.status = isBlocked ? null : '__BLOCKED__';
    return this.userRepository.save(user);
  }

  // ========== MESSAGES ==========
  async getMessages(page = 1, limit = 50, chatId?: string, senderId?: string, search?: string): Promise<{
    messages: MessageEntity[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    let queryBuilder = this.messageRepository.createQueryBuilder('message');

    if (chatId) {
      queryBuilder = queryBuilder.andWhere('message.chatId = :chatId', { chatId });
    }
    if (senderId) {
      queryBuilder = queryBuilder.andWhere('message.senderId = :senderId', { senderId });
    }
    if (search) {
      queryBuilder = queryBuilder.andWhere('message.content ILIKE :search', { search: `%${search}%` });
    }

    const [messages, total] = await queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    const result = await this.messageRepository.update(messageId, {
      isDeleted: true,
      content: '[Deleted by admin]',
    });
    return (result.affected ?? 0) > 0;
  }

  // ========== CHATS / GROUPS / CHANNELS ==========
  async getChats(page = 1, limit = 20, type?: string): Promise<{
    chats: Array<ChatEntity & { participantCount?: number; messageCount?: number }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    let queryBuilder = this.chatRepository.createQueryBuilder('chat');

    if (type) {
      queryBuilder = queryBuilder.where('chat.type = :type', { type });
    }

    const [chats, total] = await queryBuilder
      .orderBy('chat.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Enrich with counts
    const enriched = await Promise.all(
      chats.map(async (chat) => {
        const participantCount = await this.chatParticipantRepository.count({ where: { chatId: chat.id } });
        const messageCount = await this.messageRepository.count({ where: { chatId: chat.id } });
        return { ...chat, participantCount, messageCount };
      }),
    );

    return {
      chats: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getChatDetail(chatId: string): Promise<{
    chat: ChatEntity | null;
    participants: Array<ChatParticipantEntity & { user?: UserEntity }>;
    messageCount: number;
    recentMessages: MessageEntity[];
  }> {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    const participants = await this.chatParticipantRepository.find({ where: { chatId } });
    const messageCount = await this.messageRepository.count({ where: { chatId } });
    const recentMessages = await this.messageRepository.find({
      where: { chatId },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const enrichedParticipants = await Promise.all(
      participants.map(async (p) => {
        const user = await this.userRepository.findOne({ where: { id: p.userId } });
        return { ...p, user: user || undefined };
      }),
    );

    return {
      chat,
      participants: enrichedParticipants as Array<ChatParticipantEntity & { user?: UserEntity }>,
      messageCount,
      recentMessages,
    };
  }

  async deleteChat(chatId: string): Promise<boolean> {
    await this.messageRepository.delete({ chatId });
    await this.chatParticipantRepository.delete({ chatId });
    const result = await this.chatRepository.delete(chatId);
    return (result.affected ?? 0) > 0;
  }

  async removeParticipant(chatId: string, userId: string): Promise<boolean> {
    const result = await this.chatParticipantRepository.delete({ chatId, userId });
    return (result.affected ?? 0) > 0;
  }

  // ========== LABELS ==========
  async getAllLabels(): Promise<LabelEntity[]> {
    return this.labelRepository.find({ order: { createdAt: 'DESC' } });
  }

  // ========== QUICK REPLIES ==========
  async getAllQuickReplies(): Promise<QuickReplyEntity[]> {
    return this.quickReplyRepository.find({ order: { createdAt: 'DESC' } });
  }

  // ========== CHATBOT CONFIGS ==========
  async getAllChatbotConfigs(): Promise<ChatbotConfigEntity[]> {
    return this.chatbotConfigRepository.find();
  }

  // ========== ORDERS ==========
  async getOrders(page = 1, limit = 20, status?: string): Promise<{
    orders: OrderEntity[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    let queryBuilder = this.orderRepository.createQueryBuilder('order');

    if (status) {
      queryBuilder = queryBuilder.where('order.status = :status', { status });
    }

    const [orders, total] = await queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { orders, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateOrderStatus(orderId: string, status: string): Promise<OrderEntity | null> {
    await this.orderRepository.update(orderId, { status });
    return this.orderRepository.findOne({ where: { id: orderId } });
  }

  // ========== SESSIONS ==========
  async getActiveSessions(): Promise<RefreshTokenEntity[]> {
    return this.refreshTokenRepository.find({
      where: { expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });
  }

  async revokeSession(tokenId: string): Promise<boolean> {
    const result = await this.refreshTokenRepository.delete(tokenId);
    return (result.affected ?? 0) > 0;
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.refreshTokenRepository.delete({ userId });
  }

  // ========== DEVICES ==========
  async getAllDevices(page = 1, limit = 20): Promise<{
    devices: DeviceEntity[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const [devices, total] = await this.deviceRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { devices, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ========== BUSINESS PROFILES ==========
  async getAllBusinessProfiles(): Promise<BusinessProfileEntity[]> {
    return this.businessProfileRepository.find({ order: { createdAt: 'DESC' } });
  }

  // ========== AUDIT LOG ==========
  async logAction(adminId: string, action: string, details: string, targetId?: string): Promise<void> {
    const log = this.auditLogRepository.create({
      adminId,
      action,
      details,
      targetId: targetId || null,
    });
    await this.auditLogRepository.save(log);
  }

  async getAuditLogs(page = 1, limit = 50, adminId?: string, action?: string): Promise<{
    logs: AuditLogEntity[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    let queryBuilder = this.auditLogRepository.createQueryBuilder('log');

    if (adminId) {
      queryBuilder = queryBuilder.andWhere('log.adminId = :adminId', { adminId });
    }
    if (action) {
      queryBuilder = queryBuilder.andWhere('log.action = :action', { action });
    }

    const [logs, total] = await queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { logs, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ========== SYSTEM SETTINGS ==========
  async getSystemSettings(): Promise<Record<string, string>> {
    return {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || '3000',
      CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
      DB_SYNCHRONIZE: process.env.DB_SYNCHRONIZE || 'false',
      OTP_MODE: process.env.USE_TWILIO === 'true' ? 'twilio' : 'dev',
      DEV_OTP: process.env.DEV_OTP || '123456',
    };
  }

  // ========== STICKERS ==========
  async getStickers(): Promise<StickerEntity[]> {
    return this.stickerRepository.find({ order: { sortOrder: 'ASC', createdAt: 'DESC' } });
  }

  async getStickerPacks(): Promise<string[]> {
    const stickers = await this.stickerRepository
      .createQueryBuilder('sticker')
      .select('DISTINCT sticker.packName', 'packName')
      .getRawMany();
    return stickers.map(s => s.packName as string);
  }

  async createSticker(data: { packName: string; imageUrl: string; emoji?: string; sortOrder?: number }): Promise<StickerEntity> {
    const sticker = this.stickerRepository.create({
      packName: data.packName,
      imageUrl: data.imageUrl,
      emoji: data.emoji || null,
      sortOrder: data.sortOrder || 0,
      isActive: true,
    });
    return this.stickerRepository.save(sticker);
  }

  async updateSticker(id: string, data: Partial<{ packName: string; imageUrl: string; emoji: string; sortOrder: number; isActive: boolean }>): Promise<StickerEntity | null> {
    await this.stickerRepository.update(id, data);
    return this.stickerRepository.findOne({ where: { id } });
  }

  async deleteSticker(id: string): Promise<boolean> {
    const result = await this.stickerRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ========== FAQ ==========
  async getFaqs(): Promise<FaqEntity[]> {
    return this.faqRepository.find({ order: { sortOrder: 'ASC', createdAt: 'DESC' } });
  }

  async createFaq(data: { question: string; answer: string; category?: string; sortOrder?: number }): Promise<FaqEntity> {
    const faq = this.faqRepository.create({
      question: data.question,
      answer: data.answer,
      category: data.category || null,
      sortOrder: data.sortOrder || 0,
      isActive: true,
    });
    return this.faqRepository.save(faq);
  }

  async updateFaq(id: string, data: Partial<{ question: string; answer: string; category: string; sortOrder: number; isActive: boolean }>): Promise<FaqEntity | null> {
    await this.faqRepository.update(id, data);
    return this.faqRepository.findOne({ where: { id } });
  }

  async deleteFaq(id: string): Promise<boolean> {
    const result = await this.faqRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ========== MAINTENANCE MODE ==========
  private maintenanceMode = false;

  isMaintenanceMode(): boolean {
    return this.maintenanceMode;
  }

  setMaintenanceMode(enabled: boolean): { maintenanceMode: boolean } {
    this.maintenanceMode = enabled;
    return { maintenanceMode: this.maintenanceMode };
  }
}
