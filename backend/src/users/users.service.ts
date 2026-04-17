import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { phone } });
  }

  async searchByPhone(phone: string): Promise<User[]> {
    return this.userRepo.find({
      where: { phone: ILike(`%${phone}%`) },
      take: 20,
    });
  }

  async updateProfile(
    userId: string,
    data: { displayName?: string; profilePhoto?: string; about?: string },
  ): Promise<User> {
    await this.userRepo.update(userId, data);
    return this.findById(userId);
  }

  async setOnline(userId: string, isOnline: boolean): Promise<void> {
    await this.userRepo.update(userId, {
      isOnline,
      lastSeen: isOnline ? undefined : new Date(),
    });
  }
}
