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

    const updated = this.databaseService.updateUser(id, {
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
    this.databaseService.updateUser(id, { lastSeen: new Date() });
  }

  async searchByPhone(phoneNumber: string): Promise<User[]> {
    const users = this.databaseService.getAllUsers();
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
}
