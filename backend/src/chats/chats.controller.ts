import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatsService } from './chats.service';

@ApiTags('chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(private chatsService: ChatsService) {}

  @Get()
  getChats(@Request() req: any) {
    return this.chatsService.getChatsForUser(req.user.id);
  }

  @Get(':id')
  getChatById(@Request() req: any, @Param('id') id: string) {
    return this.chatsService.getChatById(id, req.user.id);
  }

  @Post('direct')
  createDirectChat(@Request() req: any, @Body('otherUserId') otherUserId: string) {
    return this.chatsService.createDirectChat(req.user.id, otherUserId);
  }

  @Post('group')
  createGroupChat(@Request() req: any, @Body() body: { title: string; memberIds: string[] }) {
    return this.chatsService.createGroupChat(req.user.id, body.title, body.memberIds);
  }

  @Get(':id/messages')
  getMessages(
    @Request() req: any,
    @Param('id') chatId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.chatsService.getMessages(chatId, req.user.id, limit ? parseInt(limit, 10) : 50, before);
  }

  @Post(':id/read')
  markRead(@Request() req: any, @Param('id') chatId: string) {
    return this.chatsService.markMessagesRead(chatId, req.user.id);
  }
}
