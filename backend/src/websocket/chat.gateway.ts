import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma-service/prisma.service';
import { RedisService } from '../redis/redis.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwt.verify(token as string);
      const userId = payload.sub;

      (client as any).userId = userId;
      client.join(`user:${userId}`);

      await this.redis.setOnline(userId, client.id);
      await this.prisma.user.update({
        where: { id: userId },
        data: { isOnline: true, lastSeen: new Date() },
      });

      // Notify others this user is online
      client.broadcast.emit('user:online', { userId });
      console.log(`User ${userId} connected (socket: ${client.id})`);
    } catch (err) {
      console.error('Socket auth failed:', (err as Error).message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (!userId) return;

    await this.redis.setOffline(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeen: new Date() },
    }).catch(() => {});

    client.broadcast.emit('user:offline', { userId, lastSeen: new Date() });
    console.log(`User ${userId} disconnected`);
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; text?: string; type?: string; tempId?: string },
  ) {
    const userId = (client as any).userId;
    if (!userId) return;

    try {
      const message = await this.prisma.message.create({
        data: {
          chatId: data.chatId,
          senderId: userId,
          type: (data.type as any) || 'TEXT',
          text: data.text,
          status: 'SENT',
        },
        include: {
          sender: { select: { id: true, displayName: true, profilePhoto: true } },
          attachments: true,
        },
      });

      // Update chat's updatedAt
      await this.prisma.chat.update({
        where: { id: data.chatId },
        data: { updatedAt: new Date() },
      });

      // Send confirmation to sender
      client.emit('message:sent', { tempId: data.tempId, message });

      // Send to all other members of the chat
      const members = await this.prisma.chatMember.findMany({
        where: { chatId: data.chatId, userId: { not: userId } },
      });

      for (const member of members) {
        this.server.to(`user:${member.userId}`).emit('message:new', { message });

        // Mark as delivered if user is online
        const isOnline = await this.redis.isOnline(member.userId);
        if (isOnline) {
          await this.prisma.message.update({
            where: { id: message.id },
            data: { status: 'DELIVERED' },
          });
          client.emit('message:delivered', { messageId: message.id });
        }
      }
    } catch (err) {
      console.error('Message send error:', (err as Error).message);
      client.emit('message:error', { tempId: data.tempId, error: 'Failed to send message' });
    }
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; messageIds: string[] },
  ) {
    const userId = (client as any).userId;
    if (!userId) return;

    await this.prisma.message.updateMany({
      where: {
        id: { in: data.messageIds },
        senderId: { not: userId },
      },
      data: { status: 'READ' },
    });

    // Notify the sender(s) their messages were read
    for (const msgId of data.messageIds) {
      const msg = await this.prisma.message.findUnique({ where: { id: msgId } });
      if (msg) {
        this.server.to(`user:${msg.senderId}`).emit('message:read', {
          messageId: msgId,
          chatId: data.chatId,
          readBy: userId,
        });
      }
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = (client as any).userId;
    if (!userId) return;

    await this.redis.setTyping(data.chatId, userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });

    const members = await this.prisma.chatMember.findMany({
      where: { chatId: data.chatId, userId: { not: userId } },
    });

    for (const member of members) {
      this.server.to(`user:${member.userId}`).emit('typing:start', {
        chatId: data.chatId,
        userId,
        displayName: user?.displayName,
      });
    }
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const userId = (client as any).userId;
    if (!userId) return;

    const members = await this.prisma.chatMember.findMany({
      where: { chatId: data.chatId, userId: { not: userId } },
    });

    for (const member of members) {
      this.server.to(`user:${member.userId}`).emit('typing:stop', {
        chatId: data.chatId,
        userId,
      });
    }
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: Socket) {
    const userId = (client as any).userId;
    if (!userId) return;
    await this.redis.setOnline(userId, client.id);
  }

  // Call signaling via Socket.IO
  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; type: 'AUDIO' | 'VIDEO'; targetUserId: string },
  ) {
    const userId = (client as any).userId;
    if (!userId) return;

    const caller = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, profilePhoto: true },
    });

    this.server.to(`user:${data.targetUserId}`).emit('call:incoming', {
      callerId: userId,
      callerName: caller?.displayName,
      callerPhoto: caller?.profilePhoto,
      chatId: data.chatId,
      type: data.type,
    });

    // Auto-timeout: mark call as missed after 45s
    setTimeout(async () => {
      // Check if call is still ringing for this target
      this.server.to(`user:${data.targetUserId}`).emit('call:timeout', {
        callerId: userId,
        chatId: data.chatId,
      });
    }, 45000);
  }

  @SubscribeMessage('call:answer')
  async handleCallAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callerId: string; chatId: string; sdp?: any },
  ) {
    const userId = (client as any).userId;
    this.server.to(`user:${data.callerId}`).emit('call:answered', {
      answererId: userId,
      chatId: data.chatId,
      sdp: data.sdp,
    });
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callerId: string; chatId: string },
  ) {
    const userId = (client as any).userId;
    this.server.to(`user:${data.callerId}`).emit('call:rejected', {
      rejecterId: userId,
      chatId: data.chatId,
    });
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; chatId: string },
  ) {
    const userId = (client as any).userId;
    this.server.to(`user:${data.targetUserId}`).emit('call:ended', {
      enderId: userId,
      chatId: data.chatId,
    });
  }

  @SubscribeMessage('call:ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; candidate: any },
  ) {
    const userId = (client as any).userId;
    this.server.to(`user:${data.targetUserId}`).emit('call:ice-candidate', {
      fromUserId: userId,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('call:offer')
  async handleCallOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; sdp: any },
  ) {
    const userId = (client as any).userId;
    this.server.to(`user:${data.targetUserId}`).emit('call:offer', {
      fromUserId: userId,
      sdp: data.sdp,
    });
  }

  // Helper to emit to a specific user
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
