import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async searchUsers(query: string, currentUserId: string) {
    return this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { displayName: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query } },
            ],
          },
        ],
      },
      select: { id: true, phone: true, displayName: true, profilePhoto: true, isOnline: true, lastSeen: true },
      take: 20,
    });
  }

  async updateProfile(userId: string, data: { displayName?: string; profilePhoto?: string; about?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async setOnlineStatus(userId: string, isOnline: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isOnline, lastSeen: new Date() },
    });
  }

  async getAllUsers(currentUserId: string) {
    return this.prisma.user.findMany({
      where: { id: { not: currentUserId } },
      select: { id: true, phone: true, displayName: true, profilePhoto: true, isOnline: true, lastSeen: true },
      orderBy: { displayName: 'asc' },
    });
  }
}
