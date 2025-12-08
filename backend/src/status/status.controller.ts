import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StatusService, CreateStatusDto } from './status.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';

@ApiTags('Status')
@Controller('status')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new status' })
  @ApiResponse({ status: 201, description: 'Status created successfully' })
  async createStatus(
    @CurrentUser() user: CurrentUserData,
    @Body() createStatusDto: CreateStatusDto,
  ) {
    return this.statusService.createStatus(user.id, createStatusDto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my statuses' })
  @ApiResponse({ status: 200, description: 'Statuses retrieved successfully' })
  async getMyStatuses(@CurrentUser() user: CurrentUserData) {
    return this.statusService.getMyStatuses(user.id);
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Get contact statuses' })
  @ApiResponse({ status: 200, description: 'Contact statuses retrieved successfully' })
  async getContactStatuses(@CurrentUser() user: CurrentUserData) {
    // For now, get all users' statuses except own
    // In production, this should filter by actual contacts
    return this.statusService.getContactStatuses([]);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Mark status as viewed' })
  @ApiResponse({ status: 200, description: 'Status marked as viewed' })
  async viewStatus(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.statusService.viewStatus(id, user.id);
  }

  @Get(':id/viewers')
  @ApiOperation({ summary: 'Get status viewers' })
  @ApiResponse({ status: 200, description: 'Viewers retrieved successfully' })
  async getStatusViewers(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.statusService.getStatusViewers(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a status' })
  @ApiResponse({ status: 200, description: 'Status deleted successfully' })
  async deleteStatus(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    await this.statusService.deleteStatus(id, user.id);
    return { message: 'Status deleted' };
  }
}
