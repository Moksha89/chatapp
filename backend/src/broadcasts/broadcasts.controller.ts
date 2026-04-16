import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BroadcastsService, CreateBroadcastDto, UpdateBroadcastDto } from './broadcasts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';

@ApiTags('Broadcasts')
@Controller('broadcasts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a broadcast list' })
  @ApiResponse({ status: 201, description: 'Broadcast list created successfully' })
  async createBroadcast(
    @CurrentUser() user: CurrentUserData,
    @Body() createBroadcastDto: CreateBroadcastDto,
  ) {
    return this.broadcastsService.createBroadcast(user.id, createBroadcastDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all broadcast lists' })
  @ApiResponse({ status: 200, description: 'Broadcast lists retrieved successfully' })
  async getBroadcasts(@CurrentUser() user: CurrentUserData) {
    return this.broadcastsService.getBroadcasts(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a broadcast list by ID' })
  @ApiResponse({ status: 200, description: 'Broadcast list retrieved successfully' })
  async getBroadcast(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.broadcastsService.getBroadcastById(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a broadcast list' })
  @ApiResponse({ status: 200, description: 'Broadcast list updated successfully' })
  async updateBroadcast(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateBroadcastDto: UpdateBroadcastDto,
  ) {
    return this.broadcastsService.updateBroadcast(id, user.id, updateBroadcastDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a broadcast list' })
  @ApiResponse({ status: 200, description: 'Broadcast list deleted successfully' })
  async deleteBroadcast(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    await this.broadcastsService.deleteBroadcast(id, user.id);
    return { message: 'Broadcast list deleted' };
  }

  @Post(':id/recipients/:recipientId')
  @ApiOperation({ summary: 'Add recipient to broadcast list' })
  @ApiResponse({ status: 200, description: 'Recipient added successfully' })
  async addRecipient(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('recipientId') recipientId: string,
  ) {
    return this.broadcastsService.addRecipient(id, user.id, recipientId);
  }

  @Delete(':id/recipients/:recipientId')
  @ApiOperation({ summary: 'Remove recipient from broadcast list' })
  @ApiResponse({ status: 200, description: 'Recipient removed successfully' })
  async removeRecipient(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Param('recipientId') recipientId: string,
  ) {
    return this.broadcastsService.removeRecipient(id, user.id, recipientId);
  }
}
