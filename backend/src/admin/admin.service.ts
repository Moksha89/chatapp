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
  PageContentEntity,
  ContactSubmissionEntity,
  ReportCategoryEntity,
  AppSettingEntity,
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
    @InjectRepository(PageContentEntity)
    private pageContentRepository: Repository<PageContentEntity>,
    @InjectRepository(ContactSubmissionEntity)
    private contactSubmissionRepository: Repository<ContactSubmissionEntity>,
    @InjectRepository(ReportCategoryEntity)
    private reportCategoryRepository: Repository<ReportCategoryEntity>,
    @InjectRepository(AppSettingEntity)
    private appSettingRepository: Repository<AppSettingEntity>,
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

  // ========== MAINTENANCE MODE (persisted to app_settings) ==========

  async isMaintenanceMode(): Promise<boolean> {
    const setting = await this.appSettingRepository.findOne({ where: { key: 'maintenance_mode' } });
    return setting?.value === 'true';
  }

  async getMaintenanceMessage(): Promise<string> {
    const setting = await this.appSettingRepository.findOne({ where: { key: 'maintenance_message' } });
    return setting?.value || 'We are currently performing maintenance. Please try again later.';
  }

  async setMaintenanceMode(enabled: boolean, message?: string): Promise<{ maintenanceMode: boolean; message: string }> {
    await this.setAppSetting('maintenance_mode', String(enabled), 'system', 'Whether maintenance mode is active');
    if (message) {
      await this.setAppSetting('maintenance_message', message, 'system', 'Maintenance mode message');
    }
    const currentMessage = await this.getMaintenanceMessage();
    return { maintenanceMode: enabled, message: currentMessage };
  }

  // ========== INSTALL WIZARD (persisted to app_settings) ==========

  async isSetupCompleted(): Promise<boolean> {
    const setting = await this.appSettingRepository.findOne({ where: { key: 'setup_completed' } });
    // If no setup_completed setting exists, check if the app has users — if so, it's already set up
    if (!setting) {
      try {
        const userCount = await this.userRepository.count();
        if (userCount > 0) {
          // App has users, mark setup as completed automatically
          await this.setAppSetting('setup_completed', 'true', 'system', 'Whether initial setup has been completed');
          return true;
        }
      } catch {
        // DB error — treat as setup completed to avoid blocking users
        return true;
      }
      return false;
    }
    return setting.value === 'true';
  }

  async getSetupStatus(): Promise<{
    isSetupCompleted: boolean;
    hasAdmin: boolean;
    hasUsers: boolean;
    hasDefaultSettings: boolean;
    hasDefaultPages: boolean;
    hasDefaultReportCategories: boolean;
    databaseConnected: boolean;
  }> {
    let hasUsers = false;
    let hasDefaultSettings = false;
    let hasDefaultPages = false;
    let hasDefaultReportCategories = false;
    let databaseConnected = false;

    try {
      const userCount = await this.userRepository.count();
      hasUsers = userCount > 0;
      databaseConnected = true;

      const settingsCount = await this.appSettingRepository.count();
      hasDefaultSettings = settingsCount > 0;

      const pagesCount = await this.pageContentRepository.count();
      hasDefaultPages = pagesCount > 0;

      const categoriesCount = await this.reportCategoryRepository.count();
      hasDefaultReportCategories = categoriesCount > 0;
    } catch {
      databaseConnected = false;
    }

    return {
      isSetupCompleted: await this.isSetupCompleted(),
      hasAdmin: true, // Always true since admin is in-memory
      hasUsers,
      hasDefaultSettings,
      hasDefaultPages,
      hasDefaultReportCategories,
      databaseConnected,
    };
  }

  async runSetupWizard(config: {
    appName?: string;
    adminPassword?: string;
    seedDefaults?: boolean;
  }): Promise<{ success: boolean; steps: Array<{ step: string; status: string }> }> {
    const steps: Array<{ step: string; status: string }> = [];

    // Step 1: Update admin password if provided
    if (config.adminPassword) {
      try {
        this.adminUsers[0].passwordHash = await bcrypt.hash(config.adminPassword, 10);
        steps.push({ step: 'Update admin password', status: 'completed' });
      } catch {
        steps.push({ step: 'Update admin password', status: 'failed' });
      }
    }

    // Step 2: Set app name if provided
    if (config.appName) {
      try {
        await this.setAppSetting('app_name', config.appName, 'general', 'Application name');
        steps.push({ step: 'Set app name', status: 'completed' });
      } catch {
        steps.push({ step: 'Set app name', status: 'failed' });
      }
    }

    // Step 3: Seed defaults
    if (config.seedDefaults !== false) {
      try {
        await this.seedDefaultSettings();
        steps.push({ step: 'Seed default settings', status: 'completed' });
      } catch {
        steps.push({ step: 'Seed default settings', status: 'failed' });
      }

      try {
        await this.seedDefaultReportCategories();
        steps.push({ step: 'Seed default report categories', status: 'completed' });
      } catch {
        steps.push({ step: 'Seed default report categories', status: 'failed' });
      }

      try {
        await this.seedDefaultPages();
        steps.push({ step: 'Seed default pages', status: 'completed' });
      } catch {
        steps.push({ step: 'Seed default pages', status: 'failed' });
      }
    }

    await this.setAppSetting('setup_completed', 'true', 'system', 'Whether initial setup has been completed');
    steps.push({ step: 'Mark setup complete', status: 'completed' });

    return { success: steps.every(s => s.status === 'completed'), steps };
  }

  // ========== PAGE CONTENT (Privacy Policy, Terms, etc.) ==========
  async getPageContents(): Promise<PageContentEntity[]> {
    return this.pageContentRepository.find({ order: { updatedAt: 'DESC' } });
  }

  async getPageBySlug(slug: string): Promise<PageContentEntity | null> {
    return this.pageContentRepository.findOne({ where: { slug } });
  }

  async createPageContent(data: { slug: string; title: string; content: string }): Promise<PageContentEntity> {
    const page = this.pageContentRepository.create({
      slug: data.slug,
      title: data.title,
      content: data.content,
      isPublished: true,
    });
    return this.pageContentRepository.save(page);
  }

  async updatePageContent(id: string, data: Partial<{ title: string; content: string; isPublished: boolean }>): Promise<PageContentEntity | null> {
    await this.pageContentRepository.update(id, data);
    return this.pageContentRepository.findOne({ where: { id } });
  }

  async deletePageContent(id: string): Promise<boolean> {
    const result = await this.pageContentRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ========== CONTACT SUBMISSIONS ==========
  async getContactSubmissions(page = 1, limit = 20, status?: string): Promise<{
    submissions: ContactSubmissionEntity[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    let queryBuilder = this.contactSubmissionRepository.createQueryBuilder('submission');
    if (status) {
      queryBuilder = queryBuilder.where('submission.status = :status', { status });
    }
    const [submissions, total] = await queryBuilder
      .orderBy('submission.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    return { submissions, total, page, totalPages: Math.ceil(total / limit) };
  }

  async createContactSubmission(data: { name: string; email: string; subject?: string; message: string }): Promise<ContactSubmissionEntity> {
    const submission = this.contactSubmissionRepository.create({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      status: 'pending',
    });
    return this.contactSubmissionRepository.save(submission);
  }

  async updateContactSubmission(id: string, data: { status?: string; adminReply?: string }): Promise<ContactSubmissionEntity | null> {
    await this.contactSubmissionRepository.update(id, data);
    return this.contactSubmissionRepository.findOne({ where: { id } });
  }

  async deleteContactSubmission(id: string): Promise<boolean> {
    const result = await this.contactSubmissionRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ========== REPORT CATEGORIES ==========
  async getReportCategories(): Promise<ReportCategoryEntity[]> {
    return this.reportCategoryRepository.find({ order: { sortOrder: 'ASC', createdAt: 'DESC' } });
  }

  async createReportCategory(data: { name: string; description?: string; sortOrder?: number }): Promise<ReportCategoryEntity> {
    const category = this.reportCategoryRepository.create({
      name: data.name,
      description: data.description,
      sortOrder: data.sortOrder || 0,
      isActive: true,
    });
    return this.reportCategoryRepository.save(category);
  }

  async updateReportCategory(id: string, data: Partial<{ name: string; description: string; sortOrder: number; isActive: boolean }>): Promise<ReportCategoryEntity | null> {
    await this.reportCategoryRepository.update(id, data);
    return this.reportCategoryRepository.findOne({ where: { id } });
  }

  async deleteReportCategory(id: string): Promise<boolean> {
    const result = await this.reportCategoryRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ========== APP SETTINGS (Media, Email, User Control) ==========
  async getAppSettings(category?: string): Promise<AppSettingEntity[]> {
    if (category) {
      return this.appSettingRepository.find({ where: { category }, order: { key: 'ASC' } });
    }
    return this.appSettingRepository.find({ order: { category: 'ASC', key: 'ASC' } });
  }

  async getAppSetting(key: string): Promise<string | null> {
    const setting = await this.appSettingRepository.findOne({ where: { key } });
    return setting ? setting.value : null;
  }

  async setAppSetting(key: string, value: string, category?: string, description?: string): Promise<AppSettingEntity> {
    let setting = await this.appSettingRepository.findOne({ where: { key } });
    if (setting) {
      setting.value = value;
      if (category) setting.category = category;
      if (description) setting.description = description;
    } else {
      setting = this.appSettingRepository.create({ key, value, category: category || 'general', description });
    }
    return this.appSettingRepository.save(setting);
  }

  async setAppSettingsBatch(settings: Array<{ key: string; value: string; category?: string; description?: string }>): Promise<AppSettingEntity[]> {
    const results: AppSettingEntity[] = [];
    for (const s of settings) {
      results.push(await this.setAppSetting(s.key, s.value, s.category, s.description));
    }
    return results;
  }

  async deleteAppSetting(key: string): Promise<boolean> {
    const result = await this.appSettingRepository.delete({ key });
    return (result.affected ?? 0) > 0;
  }

  // ========== DELETED ACCOUNTS ==========
  async getDeletedAccounts(page = 1, limit = 20): Promise<{
    users: UserEntity[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const [users, total] = await this.userRepository.findAndCount({
      where: { status: '__DELETED__' },
      order: { updatedAt: 'DESC' },
      skip,
      take: limit,
    });
    return { users, total, page, totalPages: Math.ceil(total / limit) };
  }

  async softDeleteUser(userId: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return null;
    user.status = '__DELETED__';
    return this.userRepository.save(user);
  }

  async restoreUser(userId: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return null;
    user.status = null;
    return this.userRepository.save(user);
  }

  // ========== COUNTRY STATISTICS ==========
  async getCountryStatistics(): Promise<Array<{ country: string; count: number; percentage: number }>> {
    const users = await this.userRepository.find({ select: ['country'] });
    const countryMap = new Map<string, number>();
    for (const u of users) {
      const country = u.country || 'Unknown';
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    }
    const total = users.length || 1;
    return Array.from(countryMap.entries())
      .map(([country, count]) => ({ country, count, percentage: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }

  // ========== USER APPROVAL WORKFLOW ==========
  async getPendingApprovals(page = 1, limit = 20): Promise<{ users: UserEntity[]; total: number }> {
    const [users, total] = await this.userRepository.findAndCount({
      where: { requiresApproval: true, isApproved: false },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { users, total };
  }

  async approveUser(userId: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return null;
    user.isApproved = true;
    user.requiresApproval = false;
    return this.userRepository.save(user);
  }

  async rejectUser(userId: string): Promise<boolean> {
    const result = await this.userRepository.delete(userId);
    return (result.affected ?? 0) > 0;
  }

  // ========== ADMIN ADD USERS ==========
  async adminCreateUser(data: { phoneNumber: string; displayName: string; isBusiness?: boolean; country?: string }): Promise<UserEntity> {
    const existing = await this.userRepository.findOne({ where: { phoneNumber: data.phoneNumber } });
    if (existing) throw new Error('Phone number already registered');
    const user = this.userRepository.create({
      phoneNumber: data.phoneNumber,
      displayName: data.displayName,
      isBusiness: data.isBusiness || false,
      country: data.country || null,
      isApproved: true,
      requiresApproval: false,
    });
    return this.userRepository.save(user);
  }

  // ========== ADMIN GLOBAL STATUS ==========
  async postGlobalStatus(content: string, type: 'text' | 'image' = 'text', mediaUrl?: string, backgroundColor?: string): Promise<{ id: string }> {
    // Post a status to all users from admin (system-level status)
    const adminUser = await this.userRepository.findOne({ where: { phoneNumber: 'SYSTEM' } });
    let systemUserId: string;
    if (!adminUser) {
      const systemUser = this.userRepository.create({
        phoneNumber: 'SYSTEM',
        displayName: 'System Admin',
        isBusiness: true,
        isApproved: true,
      });
      const saved = await this.userRepository.save(systemUser);
      systemUserId = saved.id;
    } else {
      systemUserId = adminUser.id;
    }
    // Create the status entry directly
    const statusRepo = this.userRepository.manager.getRepository('statuses');
    const status = statusRepo.create({
      userId: systemUserId,
      content,
      type,
      mediaUrl: mediaUrl || null,
      backgroundColor: backgroundColor || '#246BFD',
      textColor: '#FFFFFF',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      viewedBy: [],
    });
    const saved = await statusRepo.save(status);
    return { id: (saved as { id: string }).id };
  }

  // ========== CONFIGURABLE LIMITS ==========
  async getConfigurableLimits(): Promise<Record<string, string>> {
    const settings = await this.appSettingRepository.find({
      where: [
        { category: 'limits' },
        { category: 'media' },
        { category: 'user_control' },
      ],
    });
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }

  // ========== SEED DEFAULT SETTINGS ==========
  async seedDefaultSettings(): Promise<void> {
    const defaults = [
      // Media settings
      { key: 'media_max_image_size', value: '16777216', category: 'media', description: 'Max image upload size in bytes (16MB)' },
      { key: 'media_max_video_size', value: '104857600', category: 'media', description: 'Max video upload size in bytes (100MB)' },
      { key: 'media_max_document_size', value: '104857600', category: 'media', description: 'Max document upload size in bytes (100MB)' },
      { key: 'media_allowed_image_types', value: 'image/jpeg,image/png,image/gif,image/webp', category: 'media', description: 'Allowed image MIME types' },
      { key: 'media_allowed_video_types', value: 'video/mp4,video/webm,video/quicktime', category: 'media', description: 'Allowed video MIME types' },
      // Email settings
      { key: 'email_smtp_host', value: '', category: 'email', description: 'SMTP host' },
      { key: 'email_smtp_port', value: '587', category: 'email', description: 'SMTP port' },
      { key: 'email_smtp_user', value: '', category: 'email', description: 'SMTP username' },
      { key: 'email_smtp_pass', value: '', category: 'email', description: 'SMTP password' },
      { key: 'email_from_address', value: 'noreply@chatapp.com', category: 'email', description: 'From email address' },
      { key: 'email_from_name', value: 'ChatApp', category: 'email', description: 'From name' },
      // User control settings
      { key: 'user_registration_enabled', value: 'true', category: 'user_control', description: 'Enable/disable new user registration' },
      { key: 'user_email_verification_required', value: 'false', category: 'user_control', description: 'Require email verification for new users' },
      { key: 'user_max_devices', value: '5', category: 'user_control', description: 'Maximum linked devices per user' },
      { key: 'user_max_group_size', value: '256', category: 'user_control', description: 'Maximum members in a group' },
      // Configurable limits (Chatify features)
      { key: 'limits_max_forward_contacts', value: '5', category: 'limits', description: 'Max contacts to forward a message to at once' },
      { key: 'limits_status_expiry_hours', value: '24', category: 'limits', description: 'Hours before status/story expires' },
      { key: 'limits_max_broadcast_members', value: '256', category: 'limits', description: 'Max members in a broadcast list' },
      { key: 'limits_max_group_members', value: '256', category: 'limits', description: 'Max members in a group' },
      { key: 'limits_max_file_size_mb', value: '100', category: 'limits', description: 'Max file upload size in MB' },
      { key: 'limits_max_status_per_day', value: '30', category: 'limits', description: 'Max status posts per day per user' },
      // Rate App links
      { key: 'rate_app_android_url', value: '', category: 'app_links', description: 'Google Play Store rating URL' },
      { key: 'rate_app_ios_url', value: '', category: 'app_links', description: 'Apple App Store rating URL' },
      // User approval
      { key: 'user_approval_required', value: 'false', category: 'user_control', description: 'Require admin approval for new users' },
      // Sponsor status
      { key: 'sponsor_status_enabled', value: 'false', category: 'features', description: 'Enable sponsored/promoted status' },
      // Ad management
      { key: 'ads_admob_banner_id_android', value: '', category: 'ads', description: 'AdMob banner ID for Android' },
      { key: 'ads_admob_banner_id_ios', value: '', category: 'ads', description: 'AdMob banner ID for iOS' },
      { key: 'ads_facebook_banner_id', value: '', category: 'ads', description: 'Facebook Ads banner ID' },
      { key: 'ads_enabled', value: 'false', category: 'ads', description: 'Enable ad display' },
    ];

    for (const d of defaults) {
      const exists = await this.appSettingRepository.findOne({ where: { key: d.key } });
      if (!exists) {
        await this.appSettingRepository.save(this.appSettingRepository.create(d));
      }
    }
  }

  // Seed default report categories
  async seedDefaultReportCategories(): Promise<void> {
    const defaults = [
      { name: 'Spam', description: 'Unsolicited or irrelevant messages', sortOrder: 1 },
      { name: 'Harassment', description: 'Abusive or threatening behavior', sortOrder: 2 },
      { name: 'Inappropriate Content', description: 'Offensive or explicit content', sortOrder: 3 },
      { name: 'Fraud/Scam', description: 'Deceptive or fraudulent activity', sortOrder: 4 },
      { name: 'Impersonation', description: 'Pretending to be someone else', sortOrder: 5 },
      { name: 'Other', description: 'Other reason not listed above', sortOrder: 6 },
    ];

    const count = await this.reportCategoryRepository.count();
    if (count === 0) {
      for (const d of defaults) {
        await this.reportCategoryRepository.save(this.reportCategoryRepository.create({ ...d, isActive: true }));
      }
    }
  }

  // Seed default page content
  async seedDefaultPages(): Promise<void> {
    const defaults = [
      { slug: 'privacy-policy', title: 'Privacy Policy', content: '<h1>Privacy Policy</h1><p>Your privacy is important to us. This privacy policy explains how we collect, use, and protect your personal information.</p>' },
      { slug: 'terms-and-conditions', title: 'Terms & Conditions', content: '<h1>Terms & Conditions</h1><p>By using this application, you agree to the following terms and conditions.</p>' },
      { slug: 'about', title: 'About Us', content: '<h1>About</h1><p>Welcome to E-Chat Business — your professional messaging solution.</p>' },
    ];

    for (const d of defaults) {
      const exists = await this.pageContentRepository.findOne({ where: { slug: d.slug } });
      if (!exists) {
        await this.pageContentRepository.save(this.pageContentRepository.create({ ...d, isPublished: true }));
      }
    }
  }
}
