import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';

@Injectable()
export class ChatsService {
  constructor(private prisma: PrismaService) {}

  async getChatsForUser(userId: string) {
    const memberships = await this.prisma.chatMember.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            members: { include: { user: { select: { id: true, phone: true, displayName: true, profilePhoto: true, isOnline: true, lastSeen: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { id: true, displayName: true } } } },
          },
        },
      },
      orderBy: { chat: { updatedAt: 'desc' } },
    });

    // BUG 3 FIX: Compute real unread counts per chat
    const chatIds = memberships.map((m) => m.chatId);
    const unreadCounts = await Promise.all(
      chatIds.map(async (chatId) => {
        const count = await this.prisma.message.count({
          where: {
            chatId,
            senderId: { not: userId },
            status: { not: 'READ' },
          },
        });
        return { chatId, count };
      }),
    );
    const unreadMap = new Map(unreadCounts.map((u) => [u.chatId, u.count]));

    return memberships.map((m) => {
      const chat = m.chat;
      const otherMembers = chat.members.filter((mem) => mem.userId !== userId);
      const lastMessage = chat.messages[0] || null;
      const unreadCount = unreadMap.get(chat.id) || 0;

      return {
        id: chat.id,
        type: chat.type,
        title: chat.type === 'DIRECT' ? otherMembers[0]?.user.displayName || 'Unknown' : chat.title,
        participants: chat.members.map((mem) => mem.user),
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              text: lastMessage.text,
              type: lastMessage.type,
              senderId: lastMessage.senderId,
              senderName: lastMessage.sender.displayName,
              createdAt: lastMessage.createdAt,
              status: lastMessage.status,
            }
          : null,
        unreadCount,
        updatedAt: chat.updatedAt,
      };
    });
  }

  async getChatById(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: { include: { user: { select: { id: true, phone: true, displayName: true, profilePhoto: true, isOnline: true, lastSeen: true } } } },
      },
    });

    if (!chat) throw new NotFoundException('Chat not found');

    const isMember = chat.members.some((m) => m.userId === userId);
    if (!isMember) throw new BadRequestException('Not a member of this chat');

    return chat;
  }

  async createDirectChat(userId: string, otherUserId: string) {
    // Check if direct chat already exists
    const existingChat = await this.prisma.chat.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: otherUserId } } },
        ],
      },
      include: {
        members: { include: { user: { select: { id: true, phone: true, displayName: true, profilePhoto: true, isOnline: true, lastSeen: true } } } },
      },
    });

    if (existingChat) return existingChat;

    return this.prisma.chat.create({
      data: {
        type: 'DIRECT',
        members: {
          create: [
            { userId, role: 'MEMBER' },
            { userId: otherUserId, role: 'MEMBER' },
          ],
        },
      },
      include: {
        members: { include: { user: { select: { id: true, phone: true, displayName: true, profilePhoto: true, isOnline: true, lastSeen: true } } } },
      },
    });
  }

  async createGroupChat(userId: string, title: string, memberIds: string[]) {
    const allMemberIds = [userId, ...memberIds.filter((id) => id !== userId)];

    return this.prisma.chat.create({
      data: {
        type: 'GROUP',
        title,
        members: {
          create: allMemberIds.map((id, index) => ({
            userId: id,
            role: index === 0 ? 'ADMIN' : 'MEMBER',
          })),
        },
      },
      include: {
        members: { include: { user: { select: { id: true, phone: true, displayName: true, profilePhoto: true, isOnline: true, lastSeen: true } } } },
      },
    });
  }

  async getMessages(chatId: string, userId: string, limit = 50, before?: string) {
    // Verify membership
    await this.getChatById(chatId, userId);

    const whereClause: any = { chatId };
    if (before) {
      // Check if 'before' is a UUID or date string
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(before);
      if (isUuid) {
        const refMessage = await this.prisma.message.findUnique({ where: { id: before } });
        if (refMessage) {
          whereClause.createdAt = { lt: refMessage.createdAt };
        }
      } else {
        whereClause.createdAt = { lt: new Date(before) };
      }
    }

    const messages = await this.prisma.message.findMany({
      where: whereClause,
      include: {
        sender: { select: { id: true, displayName: true, profilePhoto: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse(); // Return in chronological order
  }

  async markMessagesRead(chatId: string, userId: string) {
    // Mark all messages in this chat that are not from this user as READ
    const result = await this.prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      data: { status: 'READ' },
    });

    return { updated: result.count };
  }
}
