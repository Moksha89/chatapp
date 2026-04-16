import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QuickRepliesService } from './quick-replies.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';

@ApiTags('Quick Replies')
@Controller('quick-replies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuickRepliesController {
  constructor(private readonly quickRepliesService: QuickRepliesService) {}

  @Get()
  @ApiOperation({ summary: 'List quick replies' })
  @ApiResponse({ status: 200, description: 'Quick replies retrieved successfully' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by shortcode prefix' })
  async listQuickReplies(
    @CurrentUser() user: CurrentUserData,
    @Query('search') search?: string,
  ) {
    if (search) {
      return this.quickRepliesService.searchByPrefix(user.id, search);
    }
    return this.quickRepliesService.findByUserId(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a quick reply' })
  @ApiResponse({ status: 201, description: 'Quick reply created successfully' })
  @ApiResponse({ status: 400, description: 'Shortcode already exists' })
  async createQuickReply(
    @CurrentUser() user: CurrentUserData,
    @Body() createQuickReplyDto: CreateQuickReplyDto,
  ) {
    return this.quickRepliesService.create(user.id, createQuickReplyDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a quick reply' })
  @ApiResponse({ status: 200, description: 'Quick reply updated successfully' })
  @ApiResponse({ status: 404, description: 'Quick reply not found' })
  async updateQuickReply(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateQuickReplyDto: UpdateQuickReplyDto,
  ) {
    return this.quickRepliesService.update(id, user.id, updateQuickReplyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quick reply' })
  @ApiResponse({ status: 200, description: 'Quick reply deleted successfully' })
  @ApiResponse({ status: 404, description: 'Quick reply not found' })
  async deleteQuickReply(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    await this.quickRepliesService.delete(id, user.id);
    return { message: 'Quick reply deleted successfully' };
  }

  @Get('shortcode/:shortcode')
  @ApiOperation({ summary: 'Get quick reply by shortcode' })
  @ApiResponse({ status: 200, description: 'Quick reply retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Quick reply not found' })
  async getByShortcode(
    @CurrentUser() user: CurrentUserData,
    @Param('shortcode') shortcode: string,
  ) {
    const quickReply = await this.quickRepliesService.findByShortcode(user.id, shortcode);
    if (!quickReply) {
      return { message: 'Quick reply not found' };
    }
    return quickReply;
  }
}
