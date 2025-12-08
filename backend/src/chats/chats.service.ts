import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

      const existingChat = this.databaseService.findDirectChatBetweenUsers(
        userId,
        data.participantId,
      );

      if (existingChat) {
        const participants = this.databaseService.findChatParticipantsByChatId(existingChat.id);
        return { ...existingChat, participants };
      }
    }

    const chat = this.databaseService.createChat({
      type: data.type,
      name: data.name || null,
    });

    this.databaseService.createChatParticipant({
      chatId: chat.id,
      userId,
      role: 'admin',
      joinedAt: new Date(),
      lastReadAt: null,
    });

    if (data.participantId) {
      this.databaseService.createChatParticipant({
        chatId: chat.id,
        userId: data.participantId,
        role: 'member',
        joinedAt: new Date(),
        lastReadAt: null,
      });
    }

    const participants = this.databaseService.findChatParticipantsByChatId(chat.id);
    return { ...chat, participants };
  }

  async getChatsForUser(userId: string) {
    return this.databaseService.getChatsForUser(userId);
  }

  async getChatById(chatId: string, userId: string): Promise<Chat & { participants: ChatParticipant[] }> {
    const chat = this.databaseService.findChatById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const participant = this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const participants = this.databaseService.findChatParticipantsByChatId(chatId);
    return { ...chat, participants };
  }

  async getMessages(
    chatId: string,
    userId: string,
    limit = 50,
    before?: string,
  ): Promise<Message[]> {
    const participant = this.databaseService.findChatParticipant(chatId, userId);
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
    const participant = this.databaseService.findChatParticipant(chatId, senderId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const message = this.databaseService.createMessage({
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

    this.databaseService.updateChat(chatId, { updatedAt: new Date() });

    return message;
  }

  async markMessageDelivered(messageId: string): Promise<Message> {
    const message = this.databaseService.findMessageById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const updated = this.databaseService.updateMessage(messageId, {
      status: 'delivered',
      deliveredAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundException('Message not found');
    }

    return updated;
  }

  async markMessagesRead(chatId: string, userId: string, messageIds: string[]): Promise<void> {
    const participant = this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    for (const messageId of messageIds) {
      const message = this.databaseService.findMessageById(messageId);
      if (message && message.chatId === chatId && message.senderId !== userId) {
        this.databaseService.updateMessage(messageId, {
          status: 'read',
          readAt: new Date(),
        });
      }
    }

    this.databaseService.updateChatParticipant(participant.id, {
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
