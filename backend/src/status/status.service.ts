import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { StatusEntity } from '../database/entities/status.entity';

export interface CreateStatusDto {
  content: string;
  type: 'text' | 'image' | 'video';
  mediaUrl?: string;
  backgroundColor?: string;
  textColor?: string;
}

@Injectable()
export class StatusService {
  constructor(
    @InjectRepository(StatusEntity)
    private statusRepository: Repository<StatusEntity>,
  ) {}

  async createStatus(userId: string, data: CreateStatusDto): Promise<StatusEntity> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const status = this.statusRepository.create({
      userId,
      content: data.content,
      type: data.type,
      mediaUrl: data.mediaUrl || null,
      backgroundColor: data.backgroundColor || '#25D366',
      textColor: data.textColor || '#FFFFFF',
      expiresAt,
      viewedBy: [],
    });

    return this.statusRepository.save(status);
  }

  async getMyStatuses(userId: string): Promise<StatusEntity[]> {
    return this.statusRepository.find({
      where: {
        userId,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getContactStatuses(contactIds: string[]): Promise<StatusEntity[]> {
    if (contactIds.length === 0) return [];
    
    const statuses = await this.statusRepository
      .createQueryBuilder('status')
      .leftJoinAndSelect('status.user', 'user')
      .where('status.userId IN (:...contactIds)', { contactIds })
      .andWhere('status.expiresAt > :now', { now: new Date() })
      .orderBy('status.createdAt', 'DESC')
      .getMany();

    return statuses;
  }

  async viewStatus(statusId: string, viewerId: string): Promise<StatusEntity> {
    const status = await this.statusRepository.findOne({ where: { id: statusId } });
    if (!status) {
      throw new NotFoundException('Status not found');
    }

    if (!status.viewedBy) {
      status.viewedBy = [];
    }

    if (!status.viewedBy.includes(viewerId)) {
      status.viewedBy.push(viewerId);
      await this.statusRepository.save(status);
    }

    return status;
  }

  async deleteStatus(statusId: string, userId: string): Promise<void> {
    const status = await this.statusRepository.findOne({
      where: { id: statusId, userId },
    });
    if (!status) {
      throw new NotFoundException('Status not found');
    }
    await this.statusRepository.remove(status);
  }

  async getStatusViewers(statusId: string, userId: string): Promise<string[]> {
    const status = await this.statusRepository.findOne({
      where: { id: statusId, userId },
    });
    if (!status) {
      throw new NotFoundException('Status not found');
    }
    return status.viewedBy || [];
  }
}
