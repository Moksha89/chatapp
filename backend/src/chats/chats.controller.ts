import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';

@ApiTags('Chats')
@Controller('chats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  @ApiOperation({ summary: 'List chats' })
  @ApiResponse({ status: 200, description: 'Chats retrieved successfully' })
  async listChats(@CurrentUser() user: CurrentUserData) {
    return this.chatsService.getChatsForUser(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new chat' })
  @ApiResponse({ status: 201, description: 'Chat created successfully' })
  async createChat(
    @CurrentUser() user: CurrentUserData,
    @Body() createChatDto: CreateChatDto,
  ) {
    return this.chatsService.createChat(user.id, createChatDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get chat details' })
  @ApiResponse({ status: 200, description: 'Chat retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  async getChat(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.chatsService.getChatById(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update group chat info' })
  @ApiResponse({ status: 200, description: 'Group info updated successfully' })
  async updateGroupInfo(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; iconUrl?: string },
  ) {
    return this.chatsService.updateGroupInfo(id, user.id, body);
  }

  @Post(':id/participants')
  @ApiOperation({ summary: 'Add participant to group' })
  @ApiResponse({ status: 201, description: 'Participant added successfully' })
  async addParticipant(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.chatsService.addParticipant(id, user.id, body.userId);
  }

  @Delete(':id/participants/:participantId')
  @ApiOperation({ summary: 'Remove participant from group' })
  @ApiResponse({ status: 200, description: 'Participant removed successfully' })
  async removeParticipant(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('participantId') participantId: string,
  ) {
    await this.chatsService.removeParticipant(id, user.id, participantId);
    return { message: 'Participant removed' };
  }

  @Post(':id/participants/:participantId/admin')
  @ApiOperation({ summary: 'Make participant an admin' })
  @ApiResponse({ status: 200, description: 'Participant promoted to admin' })
  async makeAdmin(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('participantId') participantId: string,
  ) {
    return this.chatsService.makeAdmin(id, user.id, participantId);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave group chat' })
  @ApiResponse({ status: 200, description: 'Left group successfully' })
  async leaveGroup(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    await this.chatsService.leaveGroup(id, user.id);
    return { message: 'Left group' };
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get chat messages' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'before', required: false, type: String })
  async getMessages(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.chatsService.getMessages(id, user.id, parsedLimit, before);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.chatsService.sendMessage(id, user.id, user.deviceId, sendMessageDto);
  }

  @Post(':id/messages/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markMessagesRead(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { messageIds: string[] },
  ) {
    await this.chatsService.markMessagesRead(id, user.id, body.messageIds);
    return { message: 'Messages marked as read' };
  }

  @Get('search/messages')
  @ApiOperation({ summary: 'Search messages across all chats' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchMessages(
    @CurrentUser() user: CurrentUserData,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.chatsService.searchMessages(user.id, query, parsedLimit);
  }

  @Get('starred/messages')
  @ApiOperation({ summary: 'Get all starred messages' })
  @ApiResponse({ status: 200, description: 'Starred messages retrieved' })
  async getStarredMessages(@CurrentUser() user: CurrentUserData) {
    return this.chatsService.getStarredMessages(user.id);
  }

  @Post(':id/messages/:messageId/star')
  @ApiOperation({ summary: 'Toggle message star' })
  @ApiResponse({ status: 200, description: 'Message star toggled' })
  async toggleMessageStar(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatsService.toggleMessageStar(chatId, user.id, messageId);
  }

  @Post(':id/messages/:messageId/forward')
  @ApiOperation({ summary: 'Forward message to another chat' })
  @ApiResponse({ status: 201, description: 'Message forwarded' })
  async forwardMessage(
    @CurrentUser() user: CurrentUserData,
    @Param('id') sourceChatId: string,
    @Param('messageId') messageId: string,
    @Body() body: { targetChatId: string },
  ) {
    return this.chatsService.forwardMessage(sourceChatId, user.id, messageId, body.targetChatId);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export chat history' })
  @ApiResponse({ status: 200, description: 'Chat exported' })
  async exportChat(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.chatsService.exportChat(id, user.id);
  }

  @Put(':id/disappearing')
  @ApiOperation({ summary: 'Set disappearing messages duration' })
  @ApiResponse({ status: 200, description: 'Disappearing messages setting updated' })
  async setDisappearingMessages(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() body: { duration: number | null },
  ) {
    return this.chatsService.setDisappearingMessages(id, user.id, body.duration);
  }

  // Message Reactions
  @Post(':id/messages/:messageId/reactions')
  @ApiOperation({ summary: 'Add reaction to message' })
  @ApiResponse({ status: 201, description: 'Reaction added' })
  async addReaction(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Param('messageId') messageId: string,
    @Body() body: { emoji: string },
  ) {
    return this.chatsService.addReaction(chatId, user.id, messageId, body.emoji);
  }

  @Delete(':id/messages/:messageId/reactions')
  @ApiOperation({ summary: 'Remove reaction from message' })
  @ApiResponse({ status: 200, description: 'Reaction removed' })
  async removeReaction(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Param('messageId') messageId: string,
    @Body() body: { emoji: string },
  ) {
    return this.chatsService.removeReaction(chatId, user.id, messageId, body.emoji);
  }

  // Edit Message
  @Put(':id/messages/:messageId')
  @ApiOperation({ summary: 'Edit message content' })
  @ApiResponse({ status: 200, description: 'Message edited' })
  async editMessage(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Param('messageId') messageId: string,
    @Body() body: { content: string },
  ) {
    return this.chatsService.editMessage(chatId, user.id, messageId, body.content);
  }

  // Delete Message
  @Delete(':id/messages/:messageId')
  @ApiOperation({ summary: 'Delete message' })
  @ApiResponse({ status: 200, description: 'Message deleted' })
  async deleteMessage(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Param('messageId') messageId: string,
    @Body() body: { deleteForEveryone?: boolean },
  ) {
    return this.chatsService.deleteMessage(chatId, user.id, messageId, body.deleteForEveryone || false);
  }

  // Get single message (for reply preview)
  @Get(':id/messages/:messageId')
  @ApiOperation({ summary: 'Get single message' })
  @ApiResponse({ status: 200, description: 'Message retrieved' })
  async getMessage(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatsService.getMessageById(chatId, user.id, messageId);
  }

  // Pin/Unpin message
  @Post(':id/pin')
  @ApiOperation({ summary: 'Pin or unpin a message in chat' })
  @ApiResponse({ status: 200, description: 'Message pinned/unpinned' })
  async pinMessage(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Body() body: { messageId: string | null },
  ) {
    return this.chatsService.pinMessage(chatId, user.id, body.messageId);
  }

  // Set chat wallpaper
  @Put(':id/wallpaper')
  @ApiOperation({ summary: 'Set chat wallpaper' })
  @ApiResponse({ status: 200, description: 'Wallpaper updated' })
  async setChatWallpaper(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Body() body: { wallpaper: string | null },
  ) {
    return this.chatsService.setChatWallpaper(chatId, user.id, body.wallpaper);
  }

  // Toggle chat lock
  @Post(':id/lock')
  @ApiOperation({ summary: 'Lock or unlock a chat' })
  @ApiResponse({ status: 200, description: 'Chat lock toggled' })
  async toggleChatLock(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
  ) {
    return this.chatsService.toggleChatLock(chatId, user.id);
  }

  // Create channel
  @Post('channels')
  @ApiOperation({ summary: 'Create a channel' })
  @ApiResponse({ status: 201, description: 'Channel created' })
  async createChannel(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { name: string; description?: string },
  ) {
    return this.chatsService.createChannel(user.id, body);
  }

  // Create community
  @Post('communities')
  @ApiOperation({ summary: 'Create a community' })
  @ApiResponse({ status: 201, description: 'Community created' })
  async createCommunity(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { name: string; description?: string },
  ) {
    return this.chatsService.createCommunity(user.id, body);
  }

  // Vote on poll
  @Post(':id/messages/:messageId/vote')
  @ApiOperation({ summary: 'Vote on a poll' })
  @ApiResponse({ status: 200, description: 'Vote recorded' })
  async votePoll(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Param('messageId') messageId: string,
    @Body() body: { optionIndex: number },
  ) {
    return this.chatsService.votePoll(chatId, user.id, messageId, body.optionIndex);
  }

  // Mark view-once message as viewed
  @Post(':id/messages/:messageId/view-once')
  @ApiOperation({ summary: 'Mark view-once message as viewed' })
  @ApiResponse({ status: 200, description: 'View-once message marked as viewed' })
  async markViewOnceViewed(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatsService.markViewOnceViewed(chatId, user.id, messageId);
  }

  // Export chat as text backup
  @Get(':id/backup')
  @ApiOperation({ summary: 'Export chat as text backup' })
  @ApiResponse({ status: 200, description: 'Chat backup generated' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'text'] })
  async backupChat(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Query('format') format?: string,
  ) {
    return this.chatsService.backupChat(id, user.id, format || 'text');
  }

  // Chatbot auto-reply configuration
  @Post(':id/chatbot')
  @ApiOperation({ summary: 'Configure chatbot auto-reply for a chat' })
  @ApiResponse({ status: 200, description: 'Chatbot configured' })
  async configureChatbot(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Body() body: { enabled: boolean; rules: Array<{ trigger: string; response: string }> },
  ) {
    return this.chatsService.configureChatbot(chatId, user.id, body);
  }

  // Get chatbot config
  @Get(':id/chatbot')
  @ApiOperation({ summary: 'Get chatbot configuration' })
  @ApiResponse({ status: 200, description: 'Chatbot config retrieved' })
  async getChatbot(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
  ) {
    return this.chatsService.getChatbot(chatId, user.id);
  }

  // Submit flow response
  @Post(':id/messages/:messageId/flow')
  @ApiOperation({ summary: 'Submit an E-Chat Flow response' })
  @ApiResponse({ status: 200, description: 'Flow response submitted' })
  async submitFlowResponse(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Param('messageId') messageId: string,
    @Body() body: { formData: Record<string, string | number | boolean> },
  ) {
    return this.chatsService.submitFlowResponse(chatId, user.id, messageId, body.formData);
  }

  // Create order from catalog
  @Post(':id/orders')
  @ApiOperation({ summary: 'Create order from catalog products' })
  @ApiResponse({ status: 201, description: 'Order created' })
  async createOrder(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Body() body: { items: Array<{ productId: string; name: string; price: number; quantity: number }> },
  ) {
    return this.chatsService.createOrder(chatId, user.id, body.items);
  }

  // Get orders for a chat
  @Get(':id/orders')
  @ApiOperation({ summary: 'Get orders for a chat' })
  @ApiResponse({ status: 200, description: 'Orders retrieved' })
  async getOrders(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
  ) {
    return this.chatsService.getOrders(chatId, user.id);
  }

  // Update order status
  @Put(':id/orders/:orderId')
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  async updateOrderStatus(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Param('orderId') orderId: string,
    @Body() body: { status: string },
  ) {
    return this.chatsService.updateOrderStatus(chatId, user.id, orderId, body.status);
  }

  // ==================== CHAT UX FEATURES ====================

  // Pin/unpin conversation
  @Put(':id/pin')
  @ApiOperation({ summary: 'Pin or unpin a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation pin toggled' })
  async pinConversation(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Body() body: { isPinned: boolean },
  ) {
    return this.chatsService.pinConversation(chatId, user.id, body.isPinned);
  }

  // Mute/unmute conversation with expiry
  @Put(':id/mute')
  @ApiOperation({ summary: 'Mute or unmute a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation mute toggled' })
  async muteConversation(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Body() body: { muted: boolean; duration?: '1h' | '8h' | '1w' | 'forever' },
  ) {
    return this.chatsService.muteConversation(chatId, user.id, body.muted, body.duration);
  }

  // Archive/unarchive conversation
  @Put(':id/archive')
  @ApiOperation({ summary: 'Archive or unarchive a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation archive toggled' })
  async archiveConversation(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Body() body: { isArchived: boolean },
  ) {
    return this.chatsService.archiveConversation(chatId, user.id, body.isArchived);
  }

  // Mark/unmark as favorite
  @Put(':id/favorite')
  @ApiOperation({ summary: 'Mark or unmark a conversation as favorite' })
  @ApiResponse({ status: 200, description: 'Conversation favorite toggled' })
  async favoriteConversation(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Body() body: { isFavorite: boolean },
  ) {
    return this.chatsService.favoriteConversation(chatId, user.id, body.isFavorite);
  }

  // Clear chat history (per-user)
  @Post(':id/clear')
  @ApiOperation({ summary: 'Clear chat history for this user' })
  @ApiResponse({ status: 200, description: 'Chat history cleared' })
  async clearChat(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
  ) {
    await this.chatsService.clearChat(chatId, user.id);
    return { message: 'Chat cleared' };
  }

  // Report contact
  @Post(':id/report')
  @ApiOperation({ summary: 'Report a contact or chat' })
  @ApiResponse({ status: 200, description: 'Report submitted' })
  async reportContact(
    @CurrentUser() user: CurrentUserData,
    @Param('id') chatId: string,
    @Body() body: { reason: string; details?: string },
  ) {
    return this.chatsService.reportContact(chatId, user.id, body.reason, body.details);
  }
}
