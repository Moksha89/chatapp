import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';

@ApiTags('Labels')
@Controller('labels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get()
  @ApiOperation({ summary: 'List labels' })
  @ApiResponse({ status: 200, description: 'Labels retrieved successfully' })
  async listLabels(@CurrentUser() user: CurrentUserData) {
    return this.labelsService.findByUserId(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a label' })
  @ApiResponse({ status: 201, description: 'Label created successfully' })
  async createLabel(
    @CurrentUser() user: CurrentUserData,
    @Body() createLabelDto: CreateLabelDto,
  ) {
    return this.labelsService.create(user.id, createLabelDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a label' })
  @ApiResponse({ status: 200, description: 'Label updated successfully' })
  @ApiResponse({ status: 404, description: 'Label not found' })
  async updateLabel(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateLabelDto: UpdateLabelDto,
  ) {
    return this.labelsService.update(id, user.id, updateLabelDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a label' })
  @ApiResponse({ status: 200, description: 'Label deleted successfully' })
  @ApiResponse({ status: 404, description: 'Label not found' })
  async deleteLabel(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    await this.labelsService.delete(id, user.id);
    return { message: 'Label deleted successfully' };
  }

  @Post('chats/:chatId')
  @ApiOperation({ summary: 'Assign labels to a chat' })
  @ApiResponse({ status: 200, description: 'Labels assigned successfully' })
  async assignLabelsToChat(
    @CurrentUser() user: CurrentUserData,
    @Param('chatId') chatId: string,
    @Body() body: { labelIds: string[] },
  ) {
    const results = [];
    for (const labelId of body.labelIds) {
      const result = await this.labelsService.assignLabelToChat(chatId, labelId, user.id);
      results.push(result);
    }
    return results;
  }

  @Delete('chats/:chatId/:labelId')
  @ApiOperation({ summary: 'Remove a label from a chat' })
  @ApiResponse({ status: 200, description: 'Label removed from chat' })
  async removeLabelFromChat(
    @CurrentUser() user: CurrentUserData,
    @Param('chatId') chatId: string,
    @Param('labelId') labelId: string,
  ) {
    await this.labelsService.removeLabelFromChat(chatId, labelId, user.id);
    return { message: 'Label removed from chat' };
  }

  @Get(':id/chats')
  @ApiOperation({ summary: 'Get chats by label' })
  @ApiResponse({ status: 200, description: 'Chats retrieved successfully' })
  async getChatsByLabel(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.labelsService.getChatsByLabel(id, user.id);
  }
}
