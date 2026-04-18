import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CallsService } from './calls.service';

@ApiTags('calls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
  constructor(private callsService: CallsService) {}

  @Post('initiate')
  initiateCall(@Request() req: any, @Body() body: { chatId: string; type: 'AUDIO' | 'VIDEO' }) {
    return this.callsService.initiateCall(req.user.id, body.chatId, body.type);
  }

  @Post(':id/answer')
  answerCall(@Request() req: any, @Param('id') callId: string) {
    return this.callsService.answerCall(callId, req.user.id);
  }

  @Post(':id/end')
  endCall(@Param('id') callId: string) {
    return this.callsService.endCall(callId);
  }

  @Post(':id/decline')
  declineCall(@Request() req: any, @Param('id') callId: string) {
    return this.callsService.declineCall(callId, req.user.id);
  }

  @Post('livekit-token')
  getLiveKitToken(@Request() req: any, @Body('roomName') roomName: string) {
    return this.callsService.generateLiveKitToken(req.user.id, roomName);
  }

  @Get('history')
  getCallHistory(@Request() req: any, @Query('limit') limit?: string) {
    return this.callsService.getCallHistory(req.user.id, limit ? parseInt(limit, 10) : 20);
  }
}
