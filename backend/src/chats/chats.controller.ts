import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('chats')
@UseGuards(AuthGuard)
export class ChatsController {
  constructor(private chatsService: ChatsService) {}

  @Get()
  async getChats(@Request() req: any) {
    return this.chatsService.getChatsForUser(req.user.id);
  }

  @Post()
  async createChat(@Request() req: any, @Body('otherUserId') otherUserId: string) {
    const chatId = await this.chatsService.findOrCreateDirectChat(req.user.id, otherUserId);
    return { chatId };
  }

  @Get(':chatId/messages')
  async getMessages(
    @Param('chatId') chatId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.chatsService.getMessages(chatId, limit ? parseInt(limit) : 50, before);
  }

  @Post(':chatId/read')
  async markRead(@Param('chatId') chatId: string, @Request() req: any) {
    await this.chatsService.markMessagesRead(chatId, req.user.id);
    return { success: true };
  }
}
