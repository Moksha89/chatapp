import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
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
}
