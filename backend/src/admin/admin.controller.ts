import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Query,
  Param,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { JwtService } from '@nestjs/jwt';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
  ) {}

  // ========== AUTH ==========
  @Post('auth/login')
  @HttpCode(200)
  async login(@Body() body: { username: string; password: string }) {
    const admin = await this.adminService.validateAdmin(body.username, body.password);
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = this.jwtService.sign(
      { sub: admin.id, username: admin.username, role: admin.role, type: 'admin' },
      { expiresIn: '24h' },
    );
    await this.adminService.logAction(admin.id, 'LOGIN', `Admin ${admin.username} logged in`);
    return { token, admin: { id: admin.id, username: admin.username, role: admin.role } };
  }

  @Get('auth/me')
  @UseGuards(AdminAuthGuard)
  async me(@Req() req: { admin: { sub: string; username: string; role: string } }) {
    return { admin: { id: req.admin.sub, username: req.admin.username, role: req.admin.role } };
  }

  // ========== DASHBOARD ==========
  @Get('dashboard/stats')
  @UseGuards(AdminAuthGuard)
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/analytics')
  @UseGuards(AdminAuthGuard)
  async getAnalytics(@Query('days') days?: string) {
    return this.adminService.getAnalyticsData(days ? parseInt(days, 10) : 30);
  }

  // ========== USER MANAGEMENT ==========
  @Get('users')
  @UseGuards(AdminAuthGuard)
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
    );
  }

  @Get('users/:id')
  @UseGuards(AdminAuthGuard)
  async getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Delete('users/:id')
  @UseGuards(AdminAuthGuard)
  async deleteUser(@Param('id') id: string, @Req() req: { admin: { sub: string } }) {
    await this.adminService.logAction(req.admin.sub, 'DELETE_USER', `Deleted user ${id}`, id);
    return { success: await this.adminService.deleteUser(id) };
  }

  @Patch('users/:id/block')
  @UseGuards(AdminAuthGuard)
  async toggleBlockUser(@Param('id') id: string, @Req() req: { admin: { sub: string } }) {
    const user = await this.adminService.toggleBlockUser(id);
    if (user) {
      await this.adminService.logAction(
        req.admin.sub,
        user.status === '__BLOCKED__' ? 'BLOCK_USER' : 'UNBLOCK_USER',
        `${user.status === '__BLOCKED__' ? 'Blocked' : 'Unblocked'} user ${id}`,
        id,
      );
    }
    return { success: !!user, user };
  }

  // ========== MESSAGES ==========
  @Get('messages')
  @UseGuards(AdminAuthGuard)
  async getMessages(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('chatId') chatId?: string,
    @Query('senderId') senderId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getMessages(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      chatId,
      senderId,
      search,
    );
  }

  @Delete('messages/:id')
  @UseGuards(AdminAuthGuard)
  async deleteMessage(@Param('id') id: string, @Req() req: { admin: { sub: string } }) {
    await this.adminService.logAction(req.admin.sub, 'DELETE_MESSAGE', `Deleted message ${id}`, id);
    return { success: await this.adminService.deleteMessage(id) };
  }

  // ========== CHATS / GROUPS / CHANNELS ==========
  @Get('chats')
  @UseGuards(AdminAuthGuard)
  async getChats(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    return this.adminService.getChats(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      type,
    );
  }

  @Get('chats/:id')
  @UseGuards(AdminAuthGuard)
  async getChatDetail(@Param('id') id: string) {
    return this.adminService.getChatDetail(id);
  }

  @Delete('chats/:id')
  @UseGuards(AdminAuthGuard)
  async deleteChat(@Param('id') id: string, @Req() req: { admin: { sub: string } }) {
    await this.adminService.logAction(req.admin.sub, 'DELETE_CHAT', `Deleted chat ${id}`, id);
    return { success: await this.adminService.deleteChat(id) };
  }

  @Delete('chats/:chatId/participants/:userId')
  @UseGuards(AdminAuthGuard)
  async removeParticipant(
    @Param('chatId') chatId: string,
    @Param('userId') userId: string,
    @Req() req: { admin: { sub: string } },
  ) {
    await this.adminService.logAction(
      req.admin.sub,
      'REMOVE_PARTICIPANT',
      `Removed ${userId} from chat ${chatId}`,
      chatId,
    );
    return { success: await this.adminService.removeParticipant(chatId, userId) };
  }

  // ========== LABELS ==========
  @Get('labels')
  @UseGuards(AdminAuthGuard)
  async getLabels() {
    return this.adminService.getAllLabels();
  }

  // ========== QUICK REPLIES ==========
  @Get('quick-replies')
  @UseGuards(AdminAuthGuard)
  async getQuickReplies() {
    return this.adminService.getAllQuickReplies();
  }

  // ========== CHATBOT CONFIGS ==========
  @Get('chatbot-configs')
  @UseGuards(AdminAuthGuard)
  async getChatbotConfigs() {
    return this.adminService.getAllChatbotConfigs();
  }

  // ========== ORDERS ==========
  @Get('orders')
  @UseGuards(AdminAuthGuard)
  async getOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getOrders(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Patch('orders/:id/status')
  @UseGuards(AdminAuthGuard)
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Req() req: { admin: { sub: string } },
  ) {
    await this.adminService.logAction(req.admin.sub, 'UPDATE_ORDER', `Updated order ${id} to ${body.status}`, id);
    return this.adminService.updateOrderStatus(id, body.status);
  }

  // ========== SESSIONS ==========
  @Get('sessions')
  @UseGuards(AdminAuthGuard)
  async getSessions() {
    return this.adminService.getActiveSessions();
  }

  @Delete('sessions/:id')
  @UseGuards(AdminAuthGuard)
  async revokeSession(@Param('id') id: string, @Req() req: { admin: { sub: string } }) {
    await this.adminService.logAction(req.admin.sub, 'REVOKE_SESSION', `Revoked session ${id}`, id);
    return { success: await this.adminService.revokeSession(id) };
  }

  @Delete('sessions/user/:userId')
  @UseGuards(AdminAuthGuard)
  async revokeUserSessions(@Param('userId') userId: string, @Req() req: { admin: { sub: string } }) {
    await this.adminService.logAction(req.admin.sub, 'REVOKE_ALL_SESSIONS', `Revoked all sessions for user ${userId}`, userId);
    await this.adminService.revokeAllUserSessions(userId);
    return { success: true };
  }

  // ========== DEVICES ==========
  @Get('devices')
  @UseGuards(AdminAuthGuard)
  async getDevices(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getAllDevices(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // ========== BUSINESS PROFILES ==========
  @Get('business-profiles')
  @UseGuards(AdminAuthGuard)
  async getBusinessProfiles() {
    return this.adminService.getAllBusinessProfiles();
  }

  // ========== AUDIT LOG ==========
  @Get('audit-logs')
  @UseGuards(AdminAuthGuard)
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
  ) {
    return this.adminService.getAuditLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      adminId,
      action,
    );
  }

  // ========== SYSTEM SETTINGS ==========
  @Get('settings')
  @UseGuards(AdminAuthGuard)
  async getSettings() {
    return this.adminService.getSystemSettings();
  }

  // ========== STICKERS ==========
  @Get('stickers')
  @UseGuards(AdminAuthGuard)
  async getStickers() {
    return this.adminService.getStickers();
  }

  @Get('stickers/packs')
  @UseGuards(AdminAuthGuard)
  async getStickerPacks() {
    return this.adminService.getStickerPacks();
  }

  @Post('stickers')
  @UseGuards(AdminAuthGuard)
  async createSticker(
    @Body() body: { packName: string; imageUrl: string; emoji?: string; sortOrder?: number },
    @Req() req: { admin: { sub: string } },
  ) {
    await this.adminService.logAction(req.admin.sub, 'CREATE_STICKER', `Created sticker in pack ${body.packName}`);
    return this.adminService.createSticker(body);
  }

  @Patch('stickers/:id')
  @UseGuards(AdminAuthGuard)
  async updateSticker(
    @Param('id') id: string,
    @Body() body: Partial<{ packName: string; imageUrl: string; emoji: string; sortOrder: number; isActive: boolean }>,
    @Req() req: { admin: { sub: string } },
  ) {
    await this.adminService.logAction(req.admin.sub, 'UPDATE_STICKER', `Updated sticker ${id}`, id);
    return this.adminService.updateSticker(id, body);
  }

  @Delete('stickers/:id')
  @UseGuards(AdminAuthGuard)
  async deleteSticker(@Param('id') id: string, @Req() req: { admin: { sub: string } }) {
    await this.adminService.logAction(req.admin.sub, 'DELETE_STICKER', `Deleted sticker ${id}`, id);
    return { success: await this.adminService.deleteSticker(id) };
  }

  // ========== FAQ ==========
  @Get('faqs')
  @UseGuards(AdminAuthGuard)
  async getFaqs() {
    return this.adminService.getFaqs();
  }

  @Post('faqs')
  @UseGuards(AdminAuthGuard)
  async createFaq(
    @Body() body: { question: string; answer: string; category?: string; sortOrder?: number },
    @Req() req: { admin: { sub: string } },
  ) {
    await this.adminService.logAction(req.admin.sub, 'CREATE_FAQ', `Created FAQ: ${body.question}`);
    return this.adminService.createFaq(body);
  }

  @Patch('faqs/:id')
  @UseGuards(AdminAuthGuard)
  async updateFaq(
    @Param('id') id: string,
    @Body() body: Partial<{ question: string; answer: string; category: string; sortOrder: number; isActive: boolean }>,
    @Req() req: { admin: { sub: string } },
  ) {
    await this.adminService.logAction(req.admin.sub, 'UPDATE_FAQ', `Updated FAQ ${id}`, id);
    return this.adminService.updateFaq(id, body);
  }

  @Delete('faqs/:id')
  @UseGuards(AdminAuthGuard)
  async deleteFaq(@Param('id') id: string, @Req() req: { admin: { sub: string } }) {
    await this.adminService.logAction(req.admin.sub, 'DELETE_FAQ', `Deleted FAQ ${id}`, id);
    return { success: await this.adminService.deleteFaq(id) };
  }

  // ========== MAINTENANCE MODE ==========
  @Get('maintenance')
  @UseGuards(AdminAuthGuard)
  async getMaintenanceMode() {
    return { maintenanceMode: this.adminService.isMaintenanceMode() };
  }

  @Post('maintenance')
  @UseGuards(AdminAuthGuard)
  async setMaintenanceMode(
    @Body() body: { enabled: boolean },
    @Req() req: { admin: { sub: string } },
  ) {
    await this.adminService.logAction(
      req.admin.sub,
      body.enabled ? 'ENABLE_MAINTENANCE' : 'DISABLE_MAINTENANCE',
      `${body.enabled ? 'Enabled' : 'Disabled'} maintenance mode`,
    );
    return this.adminService.setMaintenanceMode(body.enabled);
  }
}
