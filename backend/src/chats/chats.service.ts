import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService, Chat, Message, ChatParticipant } from '../database/database.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createChat(userId: string, data: CreateChatDto): Promise<Chat & { participants: ChatParticipant[] }> {
    if (data.type === 'direct') {
      if (!data.participantId) {
        throw new BadRequestException('participantId is required for direct chats');
      }

      const existingChat = await this.databaseService.findDirectChatBetweenUsers(
        userId,
        data.participantId,
      );

      if (existingChat) {
        const participants = await this.databaseService.findChatParticipantsByChatId(existingChat.id);
        return { ...existingChat, participants };
      }
    }

    const chat = await this.databaseService.createChat({
      type: data.type,
      name: data.name || null,
      description: data.description || null,
      iconUrl: data.iconUrl || null,
      createdBy: userId,
    });

    await this.databaseService.createChatParticipant({
      chatId: chat.id,
      userId,
      role: 'admin',
      joinedAt: new Date(),
      lastReadAt: null,
    });

    if (data.participantId) {
      await this.databaseService.createChatParticipant({
        chatId: chat.id,
        userId: data.participantId,
        role: 'member',
        joinedAt: new Date(),
        lastReadAt: null,
      });
    }

    // Add multiple participants for group chats
    if (data.participantIds && data.participantIds.length > 0) {
      for (const participantId of data.participantIds) {
        if (participantId !== userId) {
          await this.databaseService.createChatParticipant({
            chatId: chat.id,
            userId: participantId,
            role: 'member',
            joinedAt: new Date(),
            lastReadAt: null,
          });
        }
      }
    }

    const participants = await this.databaseService.findChatParticipantsByChatId(chat.id);
    return { ...chat, participants };
  }

  async addParticipant(chatId: string, userId: string, newParticipantId: string): Promise<ChatParticipant> {
    const chat = await this.databaseService.findChatById(chatId);
    if (!chat || chat.type !== 'group') {
      throw new BadRequestException('Can only add participants to group chats');
    }

    const adminParticipant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!adminParticipant || adminParticipant.role !== 'admin') {
      throw new ForbiddenException('Only admins can add participants');
    }

    const existingParticipant = await this.databaseService.findChatParticipant(chatId, newParticipantId);
    if (existingParticipant) {
      throw new BadRequestException('User is already a participant');
    }

    return this.databaseService.createChatParticipant({
      chatId,
      userId: newParticipantId,
      role: 'member',
      joinedAt: new Date(),
      lastReadAt: null,
    });
  }

  async removeParticipant(chatId: string, userId: string, participantIdToRemove: string): Promise<void> {
    const chat = await this.databaseService.findChatById(chatId);
    if (!chat || chat.type !== 'group') {
      throw new BadRequestException('Can only remove participants from group chats');
    }

    const adminParticipant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!adminParticipant || (adminParticipant.role !== 'admin' && userId !== participantIdToRemove)) {
      throw new ForbiddenException('Only admins can remove other participants');
    }

    const participantToRemove = await this.databaseService.findChatParticipant(chatId, participantIdToRemove);
    if (!participantToRemove) {
      throw new NotFoundException('Participant not found');
    }

    await this.databaseService.deleteChatParticipant(participantToRemove.id);
  }

  async makeAdmin(chatId: string, userId: string, targetUserId: string): Promise<ChatParticipant> {
    const chat = await this.databaseService.findChatById(chatId);
    if (!chat || chat.type !== 'group') {
      throw new BadRequestException('Can only manage admins in group chats');
    }

    const adminParticipant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!adminParticipant || adminParticipant.role !== 'admin') {
      throw new ForbiddenException('Only admins can promote members');
    }

    const targetParticipant = await this.databaseService.findChatParticipant(chatId, targetUserId);
    if (!targetParticipant) {
      throw new NotFoundException('Participant not found');
    }

    const updated = await this.databaseService.updateChatParticipant(targetParticipant.id, { role: 'admin' });
    if (!updated) {
      throw new NotFoundException('Failed to update participant');
    }
    return updated;
  }

  async updateGroupInfo(chatId: string, userId: string, data: { name?: string; description?: string; iconUrl?: string }): Promise<Chat> {
    const chat = await this.databaseService.findChatById(chatId);
    if (!chat || chat.type !== 'group') {
      throw new BadRequestException('Can only update group chat info');
    }

    const adminParticipant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!adminParticipant || adminParticipant.role !== 'admin') {
      throw new ForbiddenException('Only admins can update group info');
    }

    const updated = await this.databaseService.updateChat(chatId, data);
    if (!updated) {
      throw new NotFoundException('Chat not found');
    }
    return updated;
  }

  async leaveGroup(chatId: string, userId: string): Promise<void> {
    const chat = await this.databaseService.findChatById(chatId);
    if (!chat || chat.type !== 'group') {
      throw new BadRequestException('Can only leave group chats');
    }

    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Not a participant of this chat');
    }

    await this.databaseService.deleteChatParticipant(participant.id);
  }

  async getChatsForUser(userId: string) {
    return this.databaseService.getChatsForUser(userId);
  }

  async getChatById(chatId: string, userId: string): Promise<Chat & { participants: ChatParticipant[] }> {
    const chat = await this.databaseService.findChatById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const participants = await this.databaseService.findChatParticipantsByChatId(chatId);
    return { ...chat, participants };
  }

  async getMessages(
    chatId: string,
    userId: string,
    limit = 50,
    before?: string,
  ): Promise<Message[]> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    let beforeDate: Date | undefined;
    if (before) {
      beforeDate = new Date(before);
    }

    return this.databaseService.findMessagesByChatId(chatId, limit, beforeDate);
  }

  async sendMessage(
    chatId: string,
    senderId: string,
    senderDeviceId: string | undefined,
    data: SendMessageDto,
  ): Promise<Message> {
    const participant = await this.databaseService.findChatParticipant(chatId, senderId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const message = await this.databaseService.createMessage({
      chatId,
      senderId,
      senderDeviceId: senderDeviceId || null,
      content: data.content,
      ciphertext: data.ciphertext || null,
      type: data.type || 'text',
      status: 'sent',
      deliveredAt: null,
      readAt: null,
    });

    await this.databaseService.updateChat(chatId, { updatedAt: new Date() });

    return message;
  }

  async markMessageDelivered(messageId: string): Promise<Message> {
    const message = await this.databaseService.findMessageById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const updated = await this.databaseService.updateMessage(messageId, {
      status: 'delivered',
      deliveredAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundException('Message not found');
    }

    return updated;
  }

  async markMessagesRead(chatId: string, userId: string, messageIds: string[]): Promise<void> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    for (const messageId of messageIds) {
      const message = await this.databaseService.findMessageById(messageId);
      if (message && message.chatId === chatId && message.senderId !== userId) {
        await this.databaseService.updateMessage(messageId, {
          status: 'read',
          readAt: new Date(),
        });
      }
    }

    await this.databaseService.updateChatParticipant(participant.id, {
      lastReadAt: new Date(),
    });
  }

  async getChatParticipants(chatId: string): Promise<ChatParticipant[]> {
    return this.databaseService.findChatParticipantsByChatId(chatId);
  }

  async getOtherParticipants(chatId: string, userId: string): Promise<string[]> {
    const participants = await this.getChatParticipants(chatId);
    return participants
      .filter((p) => p.userId !== userId)
      .map((p) => p.userId);
  }
}
