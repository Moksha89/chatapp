import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, User } from '../database/database.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(data: {
    phoneNumber: string;
    displayName: string;
    isBusiness: boolean;
    passwordHash: string;
  }): Promise<User> {
    return this.databaseService.createUser({
      phoneNumber: data.phoneNumber,
      displayName: data.displayName,
      profilePhoto: null,
      isBusiness: data.isBusiness,
      status: null,
      lastSeen: null,
      passwordHash: data.passwordHash,
      readReceiptsEnabled: true,
      blockedUsers: null,
      language: 'en',
    });
  }

  async findById(id: string): Promise<User | undefined> {
    return this.databaseService.findUserById(id);
  }

  async findByPhone(phoneNumber: string): Promise<User | undefined> {
    return this.databaseService.findUserByPhone(phoneNumber);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.databaseService.updateUser(id, {
      displayName: updateUserDto.displayName,
      profilePhoto: updateUserDto.profilePhoto,
      status: updateUserDto.status,
    });

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return updated;
  }

  async updateLastSeen(id: string): Promise<void> {
    await this.databaseService.updateUser(id, { lastSeen: new Date() });
  }

  async searchByPhone(phoneNumber: string): Promise<User[]> {
    const users = await this.databaseService.getAllUsers();
    return users.filter((u) => u.phoneNumber.includes(phoneNumber));
  }

  async getPublicProfile(id: string): Promise<{
    id: string;
    displayName: string;
    profilePhoto: string | null;
    status: string | null;
    lastSeen: Date | null;
    isBusiness: boolean;
  } | null> {
    const user = await this.findById(id);
    if (!user) return null;

    return {
      id: user.id,
      displayName: user.displayName,
      profilePhoto: user.profilePhoto,
      status: user.status,
      lastSeen: user.lastSeen,
      isBusiness: user.isBusiness,
    };
  }

  async getAllUsers(): Promise<User[]> {
    return this.databaseService.getAllUsers();
  }

  async getPrivacySettings(userId: string): Promise<{
    readReceiptsEnabled: boolean;
    language: string;
  }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      readReceiptsEnabled: user.readReceiptsEnabled ?? true,
      language: user.language ?? 'en',
    };
  }

  async updatePrivacySettings(
    userId: string,
    settings: { readReceiptsEnabled?: boolean; language?: string },
  ): Promise<{ readReceiptsEnabled: boolean; language: string }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Partial<User> = {};
    if (settings.readReceiptsEnabled !== undefined) {
      updateData.readReceiptsEnabled = settings.readReceiptsEnabled;
    }
    if (settings.language !== undefined) {
      updateData.language = settings.language;
    }

    await this.databaseService.updateUser(userId, updateData);
    return this.getPrivacySettings(userId);
  }

  async getBlockedUsers(userId: string): Promise<string[]> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.blockedUsers || [];
  }

  async blockUser(userId: string, userIdToBlock: string): Promise<{ blocked: string[] }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const blockedUsers = user.blockedUsers || [];
    if (!blockedUsers.includes(userIdToBlock)) {
      blockedUsers.push(userIdToBlock);
      await this.databaseService.updateUser(userId, { blockedUsers });
    }

    return { blocked: blockedUsers };
  }

  async unblockUser(userId: string, userIdToUnblock: string): Promise<{ blocked: string[] }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const blockedUsers = (user.blockedUsers || []).filter((id) => id !== userIdToUnblock);
    await this.databaseService.updateUser(userId, { blockedUsers });

    return { blocked: blockedUsers };
  }

  async reportUser(
    reporterId: string,
    reportedUserId: string,
    reason: string,
    details?: string,
  ): Promise<{ success: boolean; message: string }> {
    // In a real implementation, this would store the report in a database
    // For now, we just log it and return success
    console.log(`User ${reporterId} reported user ${reportedUserId} for: ${reason}. Details: ${details || 'N/A'}`);
    return {
      success: true,
      message: 'Report submitted successfully. Our team will review it.',
    };
  }
}
