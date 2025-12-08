import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoReplyEntity } from '../database/entities/auto-reply.entity';

export interface CreateAutoReplyDto {
  type: 'greeting' | 'away' | 'quick_reply';
  message: string;
  schedule?: string;
}

export interface UpdateAutoReplyDto {
  message?: string;
  isEnabled?: boolean;
  schedule?: string;
}

@Injectable()
export class AutoRepliesService {
  constructor(
    @InjectRepository(AutoReplyEntity)
    private autoReplyRepository: Repository<AutoReplyEntity>,
  ) {}

  async createAutoReply(userId: string, data: CreateAutoReplyDto): Promise<AutoReplyEntity> {
    const autoReply = this.autoReplyRepository.create({
      userId,
      type: data.type,
      message: data.message,
      isEnabled: false,
      schedule: data.schedule || null,
    });
    return this.autoReplyRepository.save(autoReply);
  }

  async getAutoReplies(userId: string): Promise<AutoReplyEntity[]> {
    return this.autoReplyRepository.find({
      where: { userId },
      order: { type: 'ASC', createdAt: 'DESC' },
    });
  }

  async getAutoReplyByType(userId: string, type: string): Promise<AutoReplyEntity | null> {
    return this.autoReplyRepository.findOne({
      where: { userId, type, isEnabled: true },
    });
  }

  async getAutoReplyById(id: string, userId: string): Promise<AutoReplyEntity> {
    const autoReply = await this.autoReplyRepository.findOne({
      where: { id, userId },
    });
    if (!autoReply) {
      throw new NotFoundException('Auto reply not found');
    }
    return autoReply;
  }

  async updateAutoReply(id: string, userId: string, data: UpdateAutoReplyDto): Promise<AutoReplyEntity> {
    const autoReply = await this.getAutoReplyById(id, userId);
    
    if (data.message !== undefined) {
      autoReply.message = data.message;
    }
    if (data.isEnabled !== undefined) {
      autoReply.isEnabled = data.isEnabled;
    }
    if (data.schedule !== undefined) {
      autoReply.schedule = data.schedule;
    }
    
    return this.autoReplyRepository.save(autoReply);
  }

  async toggleAutoReply(id: string, userId: string): Promise<AutoReplyEntity> {
    const autoReply = await this.getAutoReplyById(id, userId);
    autoReply.isEnabled = !autoReply.isEnabled;
    return this.autoReplyRepository.save(autoReply);
  }

  async deleteAutoReply(id: string, userId: string): Promise<void> {
    const autoReply = await this.getAutoReplyById(id, userId);
    await this.autoReplyRepository.remove(autoReply);
  }

  async getGreetingMessage(userId: string): Promise<string | null> {
    const greeting = await this.getAutoReplyByType(userId, 'greeting');
    return greeting?.message || null;
  }

  async getAwayMessage(userId: string): Promise<string | null> {
    const away = await this.getAutoReplyByType(userId, 'away');
    if (!away) return null;
    
    // Check schedule if exists
    if (away.schedule) {
      try {
        const schedule = JSON.parse(away.schedule);
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();
        
        // Simple schedule check: { startHour, endHour, days: [0-6] }
        if (schedule.days && !schedule.days.includes(currentDay)) {
          return null;
        }
        if (schedule.startHour !== undefined && schedule.endHour !== undefined) {
          if (currentHour < schedule.startHour || currentHour >= schedule.endHour) {
            return null;
          }
        }
      } catch {
        // Invalid schedule, ignore
      }
    }
    
    return away.message;
  }
}
