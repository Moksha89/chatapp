import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';
import { AccessToken, VideoGrant } from 'livekit-server-sdk';

@Injectable()
export class CallsService {
  constructor(private prisma: PrismaService) {}

  async initiateCall(callerId: string, chatId: string, type: 'AUDIO' | 'VIDEO') {
    // Clean up any stale calls from this user
    await this.prisma.call.updateMany({
      where: {
        startedBy: callerId,
        status: { in: ['RINGING', 'ACTIVE'] },
      },
      data: { status: 'ENDED', endedAt: new Date() },
    });

    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true },
    });
    if (!chat) throw new NotFoundException('Chat not found');

    const call = await this.prisma.call.create({
      data: {
        chatId,
        startedBy: callerId,
        type,
        status: 'RINGING',
        participants: {
          create: chat.members.map((m) => ({
            userId: m.userId,
            status: m.userId === callerId ? 'JOINED' : 'INVITED',
            joinedAt: m.userId === callerId ? new Date() : undefined,
          })),
        },
      },
      include: { participants: true },
    });

    return call;
  }

  async answerCall(callId: string, userId: string) {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: { participants: true },
    });
    if (!call) throw new NotFoundException('Call not found');

    await this.prisma.call.update({
      where: { id: callId },
      data: { status: 'ACTIVE' },
    });

    await this.prisma.callParticipant.updateMany({
      where: { callId, userId },
      data: { status: 'JOINED', joinedAt: new Date() },
    });

    return { callId, status: 'ACTIVE' };
  }

  async endCall(callId: string) {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException('Call not found');

    const duration = call.startedAt
      ? Math.floor((Date.now() - call.startedAt.getTime()) / 1000)
      : 0;

    await this.prisma.call.update({
      where: { id: callId },
      data: { status: 'ENDED', endedAt: new Date(), duration },
    });

    await this.prisma.callParticipant.updateMany({
      where: { callId, status: { in: ['INVITED', 'JOINED'] } },
      data: { status: 'LEFT', leftAt: new Date() },
    });

    return { callId, status: 'ENDED', duration };
  }

  async declineCall(callId: string, userId: string) {
    await this.prisma.callParticipant.updateMany({
      where: { callId, userId },
      data: { status: 'DECLINED' },
    });

    // If all participants declined, mark call as DECLINED
    const remaining = await this.prisma.callParticipant.count({
      where: { callId, status: 'INVITED' },
    });
    if (remaining === 0) {
      await this.prisma.call.update({
        where: { id: callId },
        data: { status: 'DECLINED', endedAt: new Date() },
      });
    }

    return { callId, status: 'DECLINED' };
  }

  async generateLiveKitToken(userId: string, roomName: string): Promise<string> {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new BadRequestException('LiveKit not configured');
    }

    const token = new AccessToken(apiKey, apiSecret, { identity: userId });
    const grant: VideoGrant = {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    };
    token.addGrant(grant);

    return await token.toJwt();
  }

  async getCallHistory(userId: string, limit = 20) {
    return this.prisma.call.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: {
        starter: { select: { id: true, displayName: true, profilePhoto: true } },
        participants: {
          include: { user: { select: { id: true, displayName: true, profilePhoto: true } } },
        },
        chat: { select: { id: true, type: true, title: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
