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
  /**
   * Bug #11 fix: Batch fetch all participant users in one query instead of N+1
   */
  async getBlockingRecipients(chatId: string, senderId: string): Promise<string[]> {
    const participants = await this.databaseService.findChatParticipantsByChatId(chatId);
    const otherParticipantIds = participants
      .filter(p => p.userId !== senderId)
      .map(p => p.userId);
    
    if (otherParticipantIds.length === 0) return [];
    
    const users = await this.databaseService.findUsersByIds(otherParticipantIds);
    return users
      .filter(u => u.blockedUsers && u.blockedUsers.includes(senderId))
      .map(u => u.id);
  }

  /**
   * Get user's read receipts setting
   */
  async getUserReadReceiptsEnabled(userId: string): Promise<boolean> {
    const user = await this.databaseService.findUserById(userId);
    if (!user) return true; // Default to enabled
    return user.readReceiptsEnabled ?? true;
  }

  /**
   * Enrich participants with user data (displayName, phoneNumber, profilePhoto)
   * Bug #9 fix: Single batch query instead of N+1 individual queries
   */
  private async enrichParticipants(participants: ChatParticipant[]) {
    const userIds = participants.map(p => p.userId);
    const users = await this.databaseService.findUsersByIds(userIds);
    const userMap = new Map(users.map(u => [u.id, u]));
    
    return participants.map(p => {
      const user = userMap.get(p.userId);
      return {
        ...p,
        user: user ? {
          id: user.id,
          displayName: user.displayName,
          phoneNumber: user.phoneNumber,
          profilePhoto: user.profilePhoto,
        } : undefined,
      };
    });
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
        const enrichedParticipants = await this.enrichParticipants(participants);
        return { ...existingChat, participants: enrichedParticipants };
      }
    }

    const chat = await this.databaseService.createChat({
      type: data.type,
      name: data.name || null,
      description: data.description || null,
      iconUrl: data.iconUrl || null,
      createdBy: userId,
      disappearingMessagesDuration: null,
      wallpaper: null,
      isLocked: false,
      pinnedMessageId: null,
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
    const enrichedParticipants = await this.enrichParticipants(participants);
    return { ...chat, participants: enrichedParticipants };
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
    const enrichedParticipants = await this.enrichParticipants(participants);
    return { ...chat, participants: enrichedParticipants };
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

    const messages = await this.databaseService.findMessagesByChatId(chatId, limit, beforeDate);
    
    // Enrich messages with per-user isStarred status
    const messageIds = messages.map(m => m.id);
    const starredIds = await this.databaseService.getStarredMessageIdsForUser(userId, messageIds);
    return messages.map(m => ({ ...m, isStarred: starredIds.has(m.id) }));
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
      isViewOnce: data.isViewOnce || false,
      isViewed: false,
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

  /**
   * Bug #10 fix: Single batch UPDATE instead of N individual find+update queries
   */
  async markMessagesRead(chatId: string, userId: string, messageIds: string[]): Promise<{ shouldEmitReadReceipts: boolean }> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const readReceiptsEnabled = await this.getUserReadReceiptsEnabled(userId);

    // Single batch query instead of N individual queries
    await this.databaseService.markMessagesReadBatch(chatId, userId, messageIds);

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

    const updated = await this.databaseService.toggleMessageStar(messageId, userId);
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
      isViewOnce: false,
      isViewed: false,
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

  // Pin/Unpin a message in a chat
  async pinMessage(chatId: string, userId: string, messageId: string | null): Promise<Chat> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    if (messageId) {
      const message = await this.databaseService.findMessageById(messageId);
      if (!message || message.chatId !== chatId) {
        throw new NotFoundException('Message not found');
      }
    }

    const updated = await this.databaseService.updateChat(chatId, { pinnedMessageId: messageId });
    if (!updated) {
      throw new NotFoundException('Chat not found');
    }
    return updated;
  }

  // Set chat wallpaper
  async setChatWallpaper(chatId: string, userId: string, wallpaper: string | null): Promise<Chat> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const updated = await this.databaseService.updateChat(chatId, { wallpaper });
    if (!updated) {
      throw new NotFoundException('Chat not found');
    }
    return updated;
  }

  // Lock/Unlock a chat
  async toggleChatLock(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.databaseService.findChatById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const updated = await this.databaseService.updateChat(chatId, { isLocked: !chat.isLocked });
    if (!updated) {
      throw new NotFoundException('Chat not found');
    }
    return updated;
  }

  // Create a channel (type: 'channel')
  async createChannel(userId: string, data: { name: string; description?: string }): Promise<Chat & { participants: ChatParticipant[] }> {
    const chat = await this.databaseService.createChat({
      type: 'channel',
      name: data.name,
      description: data.description || null,
      iconUrl: null,
      createdBy: userId,
      disappearingMessagesDuration: null,
      wallpaper: null,
      isLocked: false,
      pinnedMessageId: null,
    });

    await this.databaseService.createChatParticipant({
      chatId: chat.id,
      userId,
      role: 'admin',
      joinedAt: new Date(),
      lastReadAt: null,
    });

    const participants = await this.databaseService.findChatParticipantsByChatId(chat.id);
    const enrichedParticipants = await this.enrichParticipants(participants);
    return { ...chat, participants: enrichedParticipants };
  }

  // Create a community (type: 'community')
  async createCommunity(userId: string, data: { name: string; description?: string }): Promise<Chat & { participants: ChatParticipant[] }> {
    const chat = await this.databaseService.createChat({
      type: 'community',
      name: data.name,
      description: data.description || null,
      iconUrl: null,
      createdBy: userId,
      disappearingMessagesDuration: null,
      wallpaper: null,
      isLocked: false,
      pinnedMessageId: null,
    });

    await this.databaseService.createChatParticipant({
      chatId: chat.id,
      userId,
      role: 'admin',
      joinedAt: new Date(),
      lastReadAt: null,
    });

    const participants = await this.databaseService.findChatParticipantsByChatId(chat.id);
    const enrichedParticipants = await this.enrichParticipants(participants);
    return { ...chat, participants: enrichedParticipants };
  }

  // Vote on a poll
  async votePoll(chatId: string, userId: string, messageId: string, optionIndex: number): Promise<Message> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const message = await this.databaseService.findMessageById(messageId);
    if (!message || message.chatId !== chatId || message.type !== 'poll') {
      throw new NotFoundException('Poll not found');
    }

    try {
      const poll = JSON.parse(message.content);
      if (optionIndex < 0 || optionIndex >= poll.options.length) {
        throw new BadRequestException('Invalid option index');
      }

      // Remove user's previous vote if any
      for (const opt of poll.options) {
        if (opt.voters) {
          opt.voters = opt.voters.filter((v: string) => v !== userId);
        }
      }

      // Add vote
      if (!poll.options[optionIndex].voters) {
        poll.options[optionIndex].voters = [];
      }
      poll.options[optionIndex].voters.push(userId);
      poll.options[optionIndex].votes = poll.options[optionIndex].voters.length;

      const updated = await this.databaseService.updateMessage(messageId, {
        content: JSON.stringify(poll),
      });
      if (!updated) {
        throw new NotFoundException('Message not found');
      }
      return updated;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException) throw e;
      throw new BadRequestException('Invalid poll data');
    }
  }

  // Mark view-once message as viewed
  async markViewOnceViewed(chatId: string, userId: string, messageId: string): Promise<Message> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const message = await this.databaseService.findMessageById(messageId);
    if (!message || message.chatId !== chatId) {
      throw new NotFoundException('Message not found');
    }

    if (!message.isViewOnce) {
      throw new BadRequestException('Message is not view-once');
    }

    if (message.isViewed) {
      throw new BadRequestException('Message already viewed');
    }

    // Only the recipient can mark as viewed (not the sender)
    if (message.senderId === userId) {
      throw new BadRequestException('Sender cannot mark own view-once message as viewed');
    }

    const updated = await this.databaseService.updateMessage(messageId, {
      isViewed: true,
    });
    if (!updated) {
      throw new NotFoundException('Message not found');
    }
    return updated;
  }

  // Chat backup in text or JSON format
  async backupChat(chatId: string, userId: string, format: string): Promise<{ filename: string; content: string; mimeType: string }> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const chat = await this.databaseService.findChatById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const messages = await this.databaseService.getMessagesForExport(chatId);
    const chatName = chat.name || 'Chat';

    // Bug #12 fix: Build a sender name lookup map using batch query
    const senderNames: Record<string, string> = {};
    const participants = await this.databaseService.findChatParticipantsByChatId(chatId);
    const participantUserIds = participants.map(p => p.userId);
    const participantUsers = await this.databaseService.findUsersByIds(participantUserIds);
    for (const u of participantUsers) {
      senderNames[u.id] = u.displayName || u.phoneNumber;
    }

    if (format === 'text') {
      let text = `Abhi Chat Backup - ${chatName}\n`;
      text += `Exported on: ${new Date().toISOString()}\n`;
      text += `Total messages: ${messages.length}\n`;
      text += '─'.repeat(50) + '\n\n';

      for (const msg of messages) {
        const date = new Date(msg.createdAt).toLocaleString();
        const sender = senderNames[msg.senderId] || msg.senderId;
        if (msg.isDeleted) {
          text += `[${date}] ${sender}: <This message was deleted>\n`;
        } else if (msg.type === 'image' || msg.type === 'video' || msg.type === 'audio' || msg.type === 'document') {
          text += `[${date}] ${sender}: <${msg.type}: ${msg.mediaName || 'attachment'}>\n`;
        } else {
          text += `[${date}] ${sender}: ${msg.content}\n`;
        }
      }

      return {
        filename: `${chatName}-backup.txt`,
        content: text,
        mimeType: 'text/plain',
      };
    }

    // JSON format
    return {
      filename: `${chatName}-backup.json`,
      content: JSON.stringify({
        chatName,
        chatId,
        exportedAt: new Date().toISOString(),
        messageCount: messages.length,
          messages: messages.map(m => ({
            id: m.id,
            sender: senderNames[m.senderId] || m.senderId,
          content: m.isDeleted ? '<deleted>' : m.content,
          type: m.type,
          mediaUrl: m.mediaUrl,
          mediaName: m.mediaName,
          createdAt: m.createdAt,
          isEdited: m.isEdited,
          isDeleted: m.isDeleted,
        })),
      }, null, 2),
      mimeType: 'application/json',
    };
  }

  // Bug #1 fix: Chatbot configs now persisted to PostgreSQL
  // Configure chatbot auto-reply
  async configureChatbot(chatId: string, userId: string, config: { enabled: boolean; rules: Array<{ trigger: string; response: string }> }): Promise<{ chatId: string; enabled: boolean; rules: Array<{ trigger: string; response: string }> }> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    await this.databaseService.saveChatbotConfig(chatId, config.enabled, config.rules);
    return { chatId, ...config };
  }

  // Get chatbot config
  async getChatbot(chatId: string, userId: string): Promise<{ chatId: string; enabled: boolean; rules: Array<{ trigger: string; response: string }> }> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const dbConfig = await this.databaseService.findChatbotConfig(chatId);
    const config = dbConfig 
      ? { enabled: dbConfig.enabled, rules: JSON.parse(dbConfig.rules) as Array<{ trigger: string; response: string }> }
      : { enabled: false, rules: [] };
    return { chatId, ...config };
  }

  // Process incoming message for chatbot auto-reply
  async processChatbotReply(chatId: string, message: Message): Promise<Message | null> {
    const dbConfig = await this.databaseService.findChatbotConfig(chatId);
    if (!dbConfig || !dbConfig.enabled) {
      return null;
    }
    const rules = JSON.parse(dbConfig.rules) as Array<{ trigger: string; response: string }>;
    if (rules.length === 0) {
      return null;
    }

    const content = message.content.toLowerCase();
    for (const rule of rules) {
      if (content.includes(rule.trigger.toLowerCase())) {
        // Send auto-reply
        const reply = await this.databaseService.createMessage({
          chatId,
          senderId: 'chatbot',
          senderDeviceId: null,
          content: rule.response,
          ciphertext: null,
          type: 'text',
          status: 'sent',
          mediaUrl: null,
          mediaType: null,
          mediaName: null,
          mediaSize: null,
          mediaDuration: null,
          deliveredAt: null,
          readAt: null,
          isStarred: false,
          forwardedFrom: null,
          replyToMessageId: message.id,
          reactions: null,
          isEdited: false,
          isDeleted: false,
          editedAt: null,
          expiresAt: null,
          isViewOnce: false,
          isViewed: false,
        });
        return reply;
      }
    }
    return null;
  }

  // Submit flow response (interactive form in chat)
  async submitFlowResponse(chatId: string, userId: string, messageId: string, formData: Record<string, string | number | boolean>): Promise<Message> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const message = await this.databaseService.findMessageById(messageId);
    if (!message || message.chatId !== chatId || message.type !== 'flow') {
      throw new NotFoundException('Flow message not found');
    }

    // Create a response message with the form data
    const responseMessage = await this.databaseService.createMessage({
      chatId,
      senderId: userId,
      senderDeviceId: null,
      content: JSON.stringify({ flowId: messageId, formData }),
      ciphertext: null,
      type: 'flow_response',
      status: 'sent',
      mediaUrl: null,
      mediaType: null,
      mediaName: null,
      mediaSize: null,
      mediaDuration: null,
      deliveredAt: null,
      readAt: null,
      isStarred: false,
      forwardedFrom: null,
      replyToMessageId: messageId,
      reactions: null,
      isEdited: false,
      isDeleted: false,
      editedAt: null,
      expiresAt: null,
      isViewOnce: false,
      isViewed: false,
    });

    return responseMessage;
  }

  // Bug #1 fix: Orders now persisted to PostgreSQL
  // Create an order from catalog products
  async createOrder(chatId: string, userId: string, items: Array<{ productId: string; name: string; price: number; quantity: number }>): Promise<{
    id: string;
    chatId: string;
    userId: string;
    items: Array<{ productId: string; name: string; price: number; quantity: number }>;
    total: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await this.databaseService.createOrder({
      chatId,
      userId,
      items: JSON.stringify(items),
      total,
      status: 'pending',
    });

    // Send order message in chat
    await this.databaseService.createMessage({
      chatId,
      senderId: userId,
      senderDeviceId: null,
      content: JSON.stringify({ orderId: order.id, items, total, status: 'pending' }),
      ciphertext: null,
      type: 'order',
      status: 'sent',
      mediaUrl: null,
      mediaType: null,
      mediaName: null,
      mediaSize: null,
      mediaDuration: null,
      deliveredAt: null,
      readAt: null,
      isStarred: false,
      forwardedFrom: null,
      replyToMessageId: null,
      reactions: null,
      isEdited: false,
      isDeleted: false,
      editedAt: null,
      expiresAt: null,
      isViewOnce: false,
      isViewed: false,
    });

    return {
      id: order.id,
      chatId: order.chatId,
      userId: order.userId,
      items,
      total: Number(order.total),
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  // Get orders for a chat
  async getOrders(chatId: string, userId: string): Promise<Array<{
    id: string;
    chatId: string;
    userId: string;
    items: Array<{ productId: string; name: string; price: number; quantity: number }>;
    total: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const dbOrders = await this.databaseService.findOrdersByChatId(chatId);
    return dbOrders.map(o => ({
      id: o.id,
      chatId: o.chatId,
      userId: o.userId,
      items: JSON.parse(o.items) as Array<{ productId: string; name: string; price: number; quantity: number }>,
      total: Number(o.total),
      status: o.status,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));
  }

  // Update order status
  async updateOrderStatus(chatId: string, userId: string, orderId: string, status: string): Promise<{
    id: string;
    chatId: string;
    userId: string;
    items: Array<{ productId: string; name: string; price: number; quantity: number }>;
    total: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updated = await this.databaseService.updateOrderStatus(orderId, status);
    if (!updated) {
      throw new NotFoundException('Order not found');
    }

    return {
      id: updated.id,
      chatId: updated.chatId,
      userId: updated.userId,
      items: JSON.parse(updated.items) as Array<{ productId: string; name: string; price: number; quantity: number }>,
      total: Number(updated.total),
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  // Bug #5 fix: Delete expired disappearing messages
  async cleanupExpiredMessages(): Promise<number> {
    return this.databaseService.deleteExpiredMessages();
  }

  // ==================== CHAT UX FEATURES ====================

  // Pin/unpin a conversation (per-user)
  async pinConversation(chatId: string, userId: string, isPinned: boolean): Promise<ChatParticipant> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }
    const updated = await this.databaseService.updateChatParticipant(participant.id, { isPinned });
    if (!updated) throw new NotFoundException('Failed to update');
    return updated;
  }

  // Mute/unmute a conversation with expiry (per-user)
  async muteConversation(
    chatId: string,
    userId: string,
    muted: boolean,
    duration?: '1h' | '8h' | '1w' | 'forever',
  ): Promise<ChatParticipant> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    let mutedUntil: Date | null = null;
    if (muted && duration) {
      const now = new Date();
      switch (duration) {
        case '1h':
          mutedUntil = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case '8h':
          mutedUntil = new Date(now.getTime() + 8 * 60 * 60 * 1000);
          break;
        case '1w':
          mutedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'forever':
          mutedUntil = new Date('2099-12-31T23:59:59Z');
          break;
      }
    }

    const updated = await this.databaseService.updateChatParticipant(participant.id, {
      isMuted: muted,
      mutedUntil,
    });
    if (!updated) throw new NotFoundException('Failed to update');
    return updated;
  }

  // Archive/unarchive a conversation (per-user)
  async archiveConversation(chatId: string, userId: string, isArchived: boolean): Promise<ChatParticipant> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }
    const updated = await this.databaseService.updateChatParticipant(participant.id, { isArchived });
    if (!updated) throw new NotFoundException('Failed to update');
    return updated;
  }

  // Mark/unmark a conversation as favorite (per-user)
  async favoriteConversation(chatId: string, userId: string, isFavorite: boolean): Promise<ChatParticipant> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }
    const updated = await this.databaseService.updateChatParticipant(participant.id, { isFavorite });
    if (!updated) throw new NotFoundException('Failed to update');
    return updated;
  }

  // Clear chat history (per-user) — sets a timestamp, messages before this are hidden
  async clearChat(chatId: string, userId: string): Promise<ChatParticipant> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }
    const updated = await this.databaseService.updateChatParticipant(participant.id, {
      clearChatBefore: new Date(),
    });
    if (!updated) throw new NotFoundException('Failed to update');
    return updated;
  }

  // Report a contact with reason
  async reportContact(chatId: string, userId: string, reason: string, details?: string): Promise<{ message: string }> {
    const participant = await this.databaseService.findChatParticipant(chatId, userId);
    if (!participant) {
      throw new NotFoundException('Chat not found');
    }
    // In a production system, this would save to a reports table
    // For now, log the report
    console.log(`Report from ${userId} on chat ${chatId}: ${reason} - ${details || 'No details'}`);
    return { message: 'Report submitted successfully' };
  }
}
