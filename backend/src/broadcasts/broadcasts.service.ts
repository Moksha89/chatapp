import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BroadcastEntity } from '../database/entities/broadcast.entity';

export interface CreateBroadcastDto {
  name: string;
  recipientIds: string[];
}

export interface UpdateBroadcastDto {
  name?: string;
  recipientIds?: string[];
}

@Injectable()
export class BroadcastsService {
  constructor(
    @InjectRepository(BroadcastEntity)
    private broadcastRepository: Repository<BroadcastEntity>,
  ) {}

  async createBroadcast(userId: string, data: CreateBroadcastDto): Promise<BroadcastEntity> {
    const broadcast = this.broadcastRepository.create({
      userId,
      name: data.name,
      recipientIds: data.recipientIds,
    });
    return this.broadcastRepository.save(broadcast);
  }

  async getBroadcasts(userId: string): Promise<BroadcastEntity[]> {
    return this.broadcastRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async getBroadcastById(id: string, userId: string): Promise<BroadcastEntity> {
    const broadcast = await this.broadcastRepository.findOne({
      where: { id, userId },
    });
    if (!broadcast) {
      throw new NotFoundException('Broadcast list not found');
    }
    return broadcast;
  }

  async updateBroadcast(id: string, userId: string, data: UpdateBroadcastDto): Promise<BroadcastEntity> {
    const broadcast = await this.getBroadcastById(id, userId);
    
    if (data.name !== undefined) {
      broadcast.name = data.name;
    }
    if (data.recipientIds !== undefined) {
      broadcast.recipientIds = data.recipientIds;
    }
    
    return this.broadcastRepository.save(broadcast);
  }

  async deleteBroadcast(id: string, userId: string): Promise<void> {
    const broadcast = await this.getBroadcastById(id, userId);
    await this.broadcastRepository.remove(broadcast);
  }

  async addRecipient(id: string, userId: string, recipientId: string): Promise<BroadcastEntity> {
    const broadcast = await this.getBroadcastById(id, userId);
    if (!broadcast.recipientIds.includes(recipientId)) {
      broadcast.recipientIds.push(recipientId);
      await this.broadcastRepository.save(broadcast);
    }
    return broadcast;
  }

  async removeRecipient(id: string, userId: string, recipientId: string): Promise<BroadcastEntity> {
    const broadcast = await this.getBroadcastById(id, userId);
    broadcast.recipientIds = broadcast.recipientIds.filter(r => r !== recipientId);
    return this.broadcastRepository.save(broadcast);
  }
}
