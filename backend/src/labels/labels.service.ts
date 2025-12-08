import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService, Label, ChatLabel } from '../database/database.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(userId: string, data: CreateLabelDto): Promise<Label> {
    return this.databaseService.createLabel({
      userId,
      name: data.name,
      color: data.color || '#808080',
    });
  }

  async findById(id: string): Promise<Label | undefined> {
    return this.databaseService.findLabelById(id);
  }

  async findByUserId(userId: string): Promise<Label[]> {
    return this.databaseService.findLabelsByUserId(userId);
  }

  async update(id: string, userId: string, data: UpdateLabelDto): Promise<Label> {
    const label = await this.findById(id);
    if (!label) {
      throw new NotFoundException('Label not found');
    }
    if (label.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this label');
    }

    const updated = this.databaseService.updateLabel(id, {
      name: data.name,
      color: data.color,
    });

    if (!updated) {
      throw new NotFoundException('Label not found');
    }

    return updated;
  }

  async delete(id: string, userId: string): Promise<void> {
    const label = await this.findById(id);
    if (!label) {
      throw new NotFoundException('Label not found');
    }
    if (label.userId !== userId) {
      throw new ForbiddenException('Not authorized to delete this label');
    }

    this.databaseService.deleteLabel(id);
  }

  async assignLabelToChat(chatId: string, labelId: string, userId: string): Promise<ChatLabel> {
    const label = await this.findById(labelId);
    if (!label || label.userId !== userId) {
      throw new NotFoundException('Label not found');
    }

    const existingLabels = this.databaseService.findChatLabelsByChatId(chatId);
    const alreadyAssigned = existingLabels.find((cl) => cl.labelId === labelId);
    if (alreadyAssigned) {
      return alreadyAssigned;
    }

    return this.databaseService.createChatLabel({
      chatId,
      labelId,
    });
  }

  async removeLabelFromChat(chatId: string, labelId: string, userId: string): Promise<void> {
    const label = await this.findById(labelId);
    if (!label || label.userId !== userId) {
      throw new NotFoundException('Label not found');
    }

    this.databaseService.deleteChatLabel(chatId, labelId);
  }

  async getChatLabels(chatId: string): Promise<Label[]> {
    const chatLabels = this.databaseService.findChatLabelsByChatId(chatId);
    const labels: Label[] = [];

    for (const cl of chatLabels) {
      const label = await this.findById(cl.labelId);
      if (label) {
        labels.push(label);
      }
    }

    return labels;
  }

  async getChatsByLabel(labelId: string, userId: string): Promise<string[]> {
    const label = await this.findById(labelId);
    if (!label || label.userId !== userId) {
      throw new NotFoundException('Label not found');
    }

    return this.databaseService.findChatsByLabelId(labelId);
  }
}
