import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DatabaseService, QuickReply } from '../database/database.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';

@Injectable()
export class QuickRepliesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(userId: string, data: CreateQuickReplyDto): Promise<QuickReply> {
    const existing = (await this.findByUserId(userId)).find(
      (qr) => qr.shortcode === data.shortcode,
    );

    if (existing) {
      throw new BadRequestException('Shortcode already exists');
    }

    return this.databaseService.createQuickReply({
      userId,
      shortcode: data.shortcode,
      message: data.message,
    });
  }

  async findById(id: string): Promise<QuickReply | undefined> {
    return this.databaseService.findQuickReplyById(id);
  }

  async findByUserId(userId: string): Promise<QuickReply[]> {
    return this.databaseService.findQuickRepliesByUserId(userId);
  }

  async findByShortcode(userId: string, shortcode: string): Promise<QuickReply | undefined> {
    const quickReplies = await this.findByUserId(userId);
    return quickReplies.find((qr) => qr.shortcode === shortcode);
  }

  async update(id: string, userId: string, data: UpdateQuickReplyDto): Promise<QuickReply> {
    const quickReply = await this.findById(id);
    if (!quickReply) {
      throw new NotFoundException('Quick reply not found');
    }
    if (quickReply.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this quick reply');
    }

    if (data.shortcode && data.shortcode !== quickReply.shortcode) {
      const existing = await this.findByShortcode(userId, data.shortcode);
      if (existing) {
        throw new BadRequestException('Shortcode already exists');
      }
    }

    const updated = await this.databaseService.updateQuickReply(id, {
      shortcode: data.shortcode,
      message: data.message,
    });

    if (!updated) {
      throw new NotFoundException('Quick reply not found');
    }

    return updated;
  }

  async delete(id: string, userId: string): Promise<void> {
    const quickReply = await this.findById(id);
    if (!quickReply) {
      throw new NotFoundException('Quick reply not found');
    }
    if (quickReply.userId !== userId) {
      throw new ForbiddenException('Not authorized to delete this quick reply');
    }

    await this.databaseService.deleteQuickReply(id);
  }

  async searchByPrefix(userId: string, prefix: string): Promise<QuickReply[]> {
    const quickReplies = await this.findByUserId(userId);
    return quickReplies.filter((qr) =>
      qr.shortcode.toLowerCase().startsWith(prefix.toLowerCase()),
    );
  }
}
