import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AutoRepliesService, CreateAutoReplyDto, UpdateAutoReplyDto } from './auto-replies.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';

@ApiTags('Auto Replies')
@Controller('auto-replies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AutoRepliesController {
  constructor(private readonly autoRepliesService: AutoRepliesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an auto reply' })
  @ApiResponse({ status: 201, description: 'Auto reply created successfully' })
  async createAutoReply(
    @CurrentUser() user: CurrentUserData,
    @Body() createAutoReplyDto: CreateAutoReplyDto,
  ) {
    return this.autoRepliesService.createAutoReply(user.id, createAutoReplyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all auto replies' })
  @ApiResponse({ status: 200, description: 'Auto replies retrieved successfully' })
  async getAutoReplies(@CurrentUser() user: CurrentUserData) {
    return this.autoRepliesService.getAutoReplies(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an auto reply by ID' })
  @ApiResponse({ status: 200, description: 'Auto reply retrieved successfully' })
  async getAutoReply(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.autoRepliesService.getAutoReplyById(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an auto reply' })
  @ApiResponse({ status: 200, description: 'Auto reply updated successfully' })
  async updateAutoReply(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateAutoReplyDto: UpdateAutoReplyDto,
  ) {
    return this.autoRepliesService.updateAutoReply(id, user.id, updateAutoReplyDto);
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Toggle auto reply enabled status' })
  @ApiResponse({ status: 200, description: 'Auto reply toggled' })
  async toggleAutoReply(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.autoRepliesService.toggleAutoReply(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an auto reply' })
  @ApiResponse({ status: 200, description: 'Auto reply deleted successfully' })
  async deleteAutoReply(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    await this.autoRepliesService.deleteAutoReply(id, user.id);
    return { message: 'Auto reply deleted' };
  }
}
