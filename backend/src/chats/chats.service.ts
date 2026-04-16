import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { Chat } from '../entities/chat.entity';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { Message } from '../entities/message.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private chatRepo: Repository<Chat>,
    @InjectRepository(ChatParticipant)
    private participantRepo: Repository<ChatParticipant>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getChatsForUser(userId: string) {
    const participants = await this.participantRepo.find({
      where: { userId },
    });

    const chatIds = participants.map((p) => p.chatId);
    if (chatIds.length === 0) return [];

    const chats: any[] = [];
    for (const chatId of chatIds) {
      const otherParticipant = await this.participantRepo.findOne({
        where: { chatId, userId: In([userId]) },
      });

      // Get ALL participants of this chat to find the other user
      const allParticipants = await this.participantRepo.find({
        where: { chatId },
      });

      const otherUserId = allParticipants.find((p) => p.userId !== userId)?.userId;
      const otherUser = otherUserId
        ? await this.userRepo.findOne({ where: { id: otherUserId } })
        : null;

      // Get last message
      const lastMessage = await this.messageRepo.findOne({
        where: { chatId },
        order: { createdAt: 'DESC' },
      });

      // Count unread messages
      const myParticipant = allParticipants.find((p) => p.userId === userId);
      let unreadCount = 0;
      if (myParticipant?.lastReadAt) {
        unreadCount = await this.messageRepo.count({
          where: {
            chatId,
            createdAt: LessThan(new Date()) as any,
          },
        });
        // More accurate: count messages after lastReadAt that aren't from me
        unreadCount = await this.messageRepo
          .createQueryBuilder('msg')
          .where('msg.chatId = :chatId', { chatId })
          .andWhere('msg.senderId != :userId', { userId })
          .andWhere('msg.createdAt > :lastRead', { lastRead: myParticipant.lastReadAt })
          .getCount();
      } else {
        unreadCount = await this.messageRepo
          .createQueryBuilder('msg')
          .where('msg.chatId = :chatId', { chatId })
          .andWhere('msg.senderId != :userId', { userId })
          .getCount();
      }

      chats.push({
        id: chatId,
        otherUser: otherUser
          ? {
              id: otherUser.id,
              phone: otherUser.phone,
              displayName: otherUser.displayName,
              profilePhoto: otherUser.profilePhoto,
              about: otherUser.about,
              isOnline: otherUser.isOnline,
              lastSeen: otherUser.lastSeen,
            }
          : null,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              type: lastMessage.type,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
              status: lastMessage.status,
            }
          : null,
        unreadCount,
      });
    }

    // Sort by last message time
    chats.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt?.getTime() || 0;
      const bTime = b.lastMessage?.createdAt?.getTime() || 0;
      return bTime - aTime;
    });

    return chats;
  }

  async findOrCreateDirectChat(userId1: string, userId2: string): Promise<string> {
    if (userId1 === userId2) {
      throw new BadRequestException('Cannot create chat with yourself');
    }

    // Check if direct chat already exists between these users
    const existing = await this.participantRepo
      .createQueryBuilder('cp1')
      .innerJoin('chat_participants', 'cp2', 'cp1.chatId = cp2.chatId')
      .where('cp1.userId = :u1 AND cp2.userId = :u2', { u1: userId1, u2: userId2 })
      .getOne();

    if (existing) {
      return existing.chatId;
    }

    // Create new chat
    const chat = this.chatRepo.create();
    const savedChat = await this.chatRepo.save(chat);

    await this.participantRepo.save([
      this.participantRepo.create({ chatId: savedChat.id, userId: userId1 }),
      this.participantRepo.create({ chatId: savedChat.id, userId: userId2 }),
    ]);

    return savedChat.id;
  }

  async getMessages(chatId: string, limit = 50, before?: string) {
    const query = this.messageRepo
      .createQueryBuilder('msg')
      .where('msg.chatId = :chatId', { chatId })
      .orderBy('msg.createdAt', 'DESC')
      .take(limit);

    if (before) {
      const refMsg = await this.messageRepo.findOne({ where: { id: before } });
      if (refMsg) {
        query.andWhere('msg.createdAt < :before', { before: refMsg.createdAt });
      }
    }

    const messages = await query.getMany();
    return messages.reverse();
  }

  async createMessage(
    chatId: string,
    senderId: string,
    content: string,
    type = 'text',
    mediaUrl?: string,
  ): Promise<Message> {
    const message = this.messageRepo.create({
      chatId,
      senderId,
      content,
      type,
      mediaUrl,
      status: 'sent',
    });
    return this.messageRepo.save(message);
  }

  async markMessagesRead(chatId: string, userId: string): Promise<void> {
    // Update participant's lastReadAt
    await this.participantRepo.update(
      { chatId, userId },
      { lastReadAt: new Date() },
    );

    // Mark all messages in chat from other users as read
    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ status: 'read' })
      .where('chatId = :chatId', { chatId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('status != :read', { read: 'read' })
      .execute();
  }

  async updateMessageStatus(messageId: string, status: string): Promise<void> {
    await this.messageRepo.update(messageId, { status });
  }

  async getChatParticipants(chatId: string): Promise<ChatParticipant[]> {
    return this.participantRepo.find({ where: { chatId } });
  }
}
