import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService, Chat, Message, ChatParticipant, User } from '../database/database.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Check if a user has blocked another user
   */
  async isUserBlocked(userId: string, potentiallyBlockedUserId: string): Promise<boolean> {
    const user = await this.databaseService.findUserById(userId);
    if (!user || !user.blockedUsers) return false;
    return user.blockedUsers.includes(potentiallyBlockedUserId);
  }

  /**
   * Check if the sender is blocked by any recipient in the chat
   * Returns the list of recipients who have blocked the sender
   */
  async getBlockingRecipients(chatId: string, senderId: string): Promise<string[]> {
    const participants = await this.databaseService.findChatParticipantsByChatId(chatId);
    const blockingRecipients: string[] = [];
    
    for (const participant of participants) {
      if (participant.userId !== senderId) {
        const isBlocked = await this.isUserBlocked(participant.userId, senderId);
        if (isBlocked) {
          blockingRecipients.push(participant.userId);
        }
      }
    }
    
    return blockingRecipients;
  }

  /**
   * Get user's read receipts setting
   */
  async getUserReadReceiptsEnabled(userId: string): Promise<boolean> {
    const user = await this.databaseService.findUserById(userId);
    if (!user) return true; // Default to enabled
    return user.readReceiptsEnabled ?? true;
  }

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
      disappearingMessagesDuration: null,
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
  ): Promise<Message & { blockedByRecipients?: string[] }> {
    const participant = await this.databaseService.findChatParticipant(chatId, senderId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    // Check if sender is blocked by any recipient (for direct chats)
    const chat = await this.databaseService.findChatById(chatId);
    let blockedByRecipients: string[] = [];
    
    if (chat && chat.type === 'direct') {
      blockedByRecipients = await this.getBlockingRecipients(chatId, senderId);
      // For direct chats, if the only recipient has blocked the sender, reject the message
      if (blockedByRecipients.length > 0) {
        throw new ForbiddenException('You cannot send messages to this user');
      }
    }

    const message = await this.databaseService.createMessage({
      chatId,
      senderId,
      senderDeviceId: senderDeviceId || null,
      content: data.content,
      ciphertext: data.ciphertext || null,
      type: data.type || 'text',
      status: 'sent',
      mediaUrl: data.mediaUrl || null,
      mediaType: data.mediaType || null,
      mediaName: data.mediaName || null,
      mediaSize: data.mediaSize || null,
      mediaDuration: data.mediaDuration || null,
      deliveredAt: null,
      readAt: null,
      isStarred: false,
      forwardedFrom: null,
      replyToMessageId: data.replyToMessageId || null,
      reactions: null,
      isEdited: false,
      isDeleted: false,
      editedAt: null,
      expiresAt: null,
    });

    await this.databaseService.updateChat(chatId, { updatedAt: new Date() });

    // For group chats, return the list of recipients who blocked the sender
    // so the WebSocket handler can skip sending to them
    return { ...message, blockedByRecipients };
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

  async markMessagesRead(chatId: string, userId: string, messageIds: string[]): Promise<{ shouldEmitReadReceipts: boolean }> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    // Check if the reader has read receipts enabled
    // If disabled, we still mark messages as read locally but don't emit to sender
    const readReceiptsEnabled = await this.getUserReadReceiptsEnabled(userId);

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

    return { shouldEmitReadReceipts: readReceiptsEnabled };
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

  async searchMessages(userId: string, query: string, limit: number): Promise<Message[]> {
    return this.databaseService.searchMessages(userId, query, limit);
  }

  async getStarredMessages(userId: string): Promise<Message[]> {
    return this.databaseService.getStarredMessages(userId);
  }

  async toggleMessageStar(chatId: string, userId: string, messageId: string): Promise<Message> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const message = await this.databaseService.findMessageById(messageId);
    if (!message || message.chatId !== chatId) {
      throw new NotFoundException('Message not found');
    }

    const updated = await this.databaseService.toggleMessageStar(messageId);
    if (!updated) {
      throw new NotFoundException('Message not found');
    }
    return updated;
  }

  async forwardMessage(
    sourceChatId: string,
    userId: string,
    messageId: string,
    targetChatId: string,
  ): Promise<Message> {
    const sourceParticipant = await this.databaseService.findChatParticipant(sourceChatId, userId);
    if (!sourceParticipant) {
      throw new NotFoundException('Source chat not found');
    }

    const targetParticipant = await this.databaseService.findChatParticipant(targetChatId, userId);
    if (!targetParticipant) {
      throw new NotFoundException('Target chat not found');
    }

    const originalMessage = await this.databaseService.findMessageById(messageId);
    if (!originalMessage || originalMessage.chatId !== sourceChatId) {
      throw new NotFoundException('Message not found');
    }

    const forwardedMessage = await this.databaseService.createMessage({
      chatId: targetChatId,
      senderId: userId,
      senderDeviceId: null,
      content: originalMessage.content,
      ciphertext: null,
      type: originalMessage.type,
      status: 'sent',
      mediaUrl: originalMessage.mediaUrl,
      mediaType: originalMessage.mediaType,
      mediaName: originalMessage.mediaName,
      mediaSize: originalMessage.mediaSize,
      mediaDuration: originalMessage.mediaDuration,
      deliveredAt: null,
      readAt: null,
      isStarred: false,
      forwardedFrom: originalMessage.id,
      replyToMessageId: null,
      reactions: null,
      isEdited: false,
      isDeleted: false,
      editedAt: null,
      expiresAt: null,
    });

    await this.databaseService.updateChat(targetChatId, { updatedAt: new Date() });
    return forwardedMessage;
  }

  async exportChat(chatId: string, userId: string): Promise<{ chat: Chat; messages: Message[]; participants: ChatParticipant[] }> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const chat = await this.databaseService.findChatById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const messages = await this.databaseService.getMessagesForExport(chatId);
    const participants = await this.databaseService.findChatParticipantsByChatId(chatId);

    return { chat, messages, participants };
  }

  async setDisappearingMessages(chatId: string, userId: string, duration: number | null): Promise<Chat> {
    const chat = await this.databaseService.findChatById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    // For group chats, only admins can change this setting
    if (chat.type === 'group' && participant.role !== 'admin') {
      throw new ForbiddenException('Only admins can change disappearing messages setting');
    }

    const updated = await this.databaseService.updateChat(chatId, { 
      disappearingMessagesDuration: duration 
    });
    if (!updated) {
      throw new NotFoundException('Chat not found');
    }
    return updated;
  }

  // Message Reactions
  async addReaction(chatId: string, userId: string, messageId: string, emoji: string): Promise<Message> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const message = await this.databaseService.findMessageById(messageId);
    if (!message || message.chatId !== chatId) {
      throw new NotFoundException('Message not found');
    }

    const reactions = message.reactions || {};
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }
    if (!reactions[emoji].includes(userId)) {
      reactions[emoji].push(userId);
    }

    const updated = await this.databaseService.updateMessage(messageId, { reactions });
    if (!updated) {
      throw new NotFoundException('Message not found');
    }
    return updated;
  }

  async removeReaction(chatId: string, userId: string, messageId: string, emoji: string): Promise<Message> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const message = await this.databaseService.findMessageById(messageId);
    if (!message || message.chatId !== chatId) {
      throw new NotFoundException('Message not found');
    }

    const reactions = message.reactions || {};
    if (reactions[emoji]) {
      reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    const updated = await this.databaseService.updateMessage(messageId, { 
      reactions: Object.keys(reactions).length > 0 ? reactions : null 
    });
    if (!updated) {
      throw new NotFoundException('Message not found');
    }
    return updated;
  }

  // Edit Message
  async editMessage(chatId: string, userId: string, messageId: string, newContent: string): Promise<Message> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const message = await this.databaseService.findMessageById(messageId);
    if (!message || message.chatId !== chatId) {
      throw new NotFoundException('Message not found');
    }

    // Only the sender can edit their own message
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Check if message is within edit window (15 minutes)
    const editWindowMs = 15 * 60 * 1000;
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    if (messageAge > editWindowMs) {
      throw new ForbiddenException('Message can only be edited within 15 minutes of sending');
    }

    const updated = await this.databaseService.updateMessage(messageId, {
      content: newContent,
      isEdited: true,
      editedAt: new Date(),
    });
    if (!updated) {
      throw new NotFoundException('Message not found');
    }
    return updated;
  }

  // Delete Message
  async deleteMessage(chatId: string, userId: string, messageId: string, deleteForEveryone: boolean): Promise<Message> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const message = await this.databaseService.findMessageById(messageId);
    if (!message || message.chatId !== chatId) {
      throw new NotFoundException('Message not found');
    }

    // Only the sender can delete for everyone
    if (deleteForEveryone && message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages for everyone');
    }

    // Check if message is within delete window (1 hour) for delete for everyone
    if (deleteForEveryone) {
      const deleteWindowMs = 60 * 60 * 1000;
      const messageAge = Date.now() - new Date(message.createdAt).getTime();
      if (messageAge > deleteWindowMs) {
        throw new ForbiddenException('Message can only be deleted for everyone within 1 hour of sending');
      }
    }

    const updated = await this.databaseService.updateMessage(messageId, {
      isDeleted: true,
      content: deleteForEveryone ? 'This message was deleted' : message.content,
    });
    if (!updated) {
      throw new NotFoundException('Message not found');
    }
    return updated;
  }

  // Get message by ID (for reply preview)
  async getMessageById(chatId: string, userId: string, messageId: string): Promise<Message> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const message = await this.databaseService.findMessageById(messageId);
    if (!message || message.chatId !== chatId) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }
}
