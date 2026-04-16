import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';

@ApiTags('Calls')
@Controller('calls')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate a call' })
  @ApiResponse({ status: 201, description: 'Call initiated' })
  async initiateCall(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { receiverId?: string; chatId?: string; callType: 'audio' | 'video'; callMode?: 'direct' | 'group' },
  ) {
    return this.callsService.initiateCall(user.id, body);
  }

  @Post(':id/answer')
  @ApiOperation({ summary: 'Answer a call' })
  @ApiResponse({ status: 200, description: 'Call answered' })
  async answerCall(
    @CurrentUser() user: CurrentUserData,
    @Param('id') callId: string,
  ) {
    return this.callsService.answerCall(callId, user.id);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline a call' })
  @ApiResponse({ status: 200, description: 'Call declined' })
  async declineCall(
    @CurrentUser() user: CurrentUserData,
    @Param('id') callId: string,
  ) {
    return this.callsService.declineCall(callId, user.id);
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End a call' })
  @ApiResponse({ status: 200, description: 'Call ended' })
  async endCall(
    @CurrentUser() user: CurrentUserData,
    @Param('id') callId: string,
  ) {
    return this.callsService.endCall(callId, user.id);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a group call' })
  @ApiResponse({ status: 200, description: 'Left call' })
  async leaveCall(
    @CurrentUser() user: CurrentUserData,
    @Param('id') callId: string,
  ) {
    return this.callsService.leaveCall(callId, user.id);
  }

  @Post(':id/participants')
  @ApiOperation({ summary: 'Add participant to call' })
  @ApiResponse({ status: 201, description: 'Participant added' })
  async addParticipant(
    @CurrentUser() user: CurrentUserData,
    @Param('id') callId: string,
    @Body() body: { userId: string },
  ) {
    return this.callsService.addParticipant(callId, user.id, body.userId);
  }

  @Put(':id/mute')
  @ApiOperation({ summary: 'Toggle mute' })
  @ApiResponse({ status: 200, description: 'Mute toggled' })
  async toggleMute(
    @CurrentUser() user: CurrentUserData,
    @Param('id') callId: string,
  ) {
    return this.callsService.toggleMute(callId, user.id);
  }

  @Put(':id/video')
  @ApiOperation({ summary: 'Toggle video' })
  @ApiResponse({ status: 200, description: 'Video toggled' })
  async toggleVideo(
    @CurrentUser() user: CurrentUserData,
    @Param('id') callId: string,
  ) {
    return this.callsService.toggleVideo(callId, user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get call history' })
  @ApiResponse({ status: 200, description: 'Call history retrieved' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getCallHistory(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.callsService.getCallHistory(user.id, parsedLimit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get call details' })
  @ApiResponse({ status: 200, description: 'Call retrieved' })
  async getCall(@Param('id') callId: string) {
    return this.callsService.getCallById(callId);
  }
}
