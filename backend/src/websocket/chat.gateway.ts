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
import { NotificationsService } from '../notifications/notifications.service';
import { CallsService } from '../calls/calls.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // BUG 1 FIX: Track call timeouts so we can cancel them when calls are answered
  private callTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
    private redis: RedisService,
    private notifications: NotificationsService,
    private callsService: CallsService,
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

      await this.redis.addSocket(userId, client.id);
      await this.prisma.user.update({
        where: { id: userId },
        data: { isOnline: true, lastSeen: new Date() },
      });

      // BUG 5 FIX: Only notify users who share a chat with this user (not all connected users)
      const userChats = await this.prisma.chatMember.findMany({
        where: { userId },
        select: { chatId: true },
      });
      const chatIds = userChats.map((c) => c.chatId);
      if (chatIds.length > 0) {
        const chatMembers = await this.prisma.chatMember.findMany({
          where: { chatId: { in: chatIds }, userId: { not: userId } },
          select: { userId: true },
        });
        const uniqueUserIds = [...new Set(chatMembers.map((m) => m.userId))];
        for (const uid of uniqueUserIds) {
          this.server.to(`user:${uid}`).emit('user:online', { userId });
        }
      }
      console.log(`User ${userId} connected (socket: ${client.id})`);
    } catch (err) {
      console.error('Socket auth failed:', (err as Error).message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (!userId) return;

    // BUG 4 FIX: Only mark offline if this was the user's last socket
    await this.redis.removeSocket(userId, client.id);
    const remainingSockets = await this.redis.getSocketCount(userId);

    if (remainingSockets === 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() },
      }).catch(() => {});

      // BUG 5 FIX: Only notify users who share a chat
      const userChats = await this.prisma.chatMember.findMany({
        where: { userId },
        select: { chatId: true },
      });
      const chatIds = userChats.map((c) => c.chatId);
      if (chatIds.length > 0) {
        const chatMembers = await this.prisma.chatMember.findMany({
          where: { chatId: { in: chatIds }, userId: { not: userId } },
          select: { userId: true },
        });
        const uniqueUserIds = [...new Set(chatMembers.map((m) => m.userId))];
        for (const uid of uniqueUserIds) {
          this.server.to(`user:${uid}`).emit('user:offline', { userId, lastSeen: new Date() });
        }
      }
    }
    console.log(`User ${userId} disconnected (remaining sockets: ${remainingSockets})`);
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
        } else {
          // User is offline — send FCM push notification
          const sender = message.sender;
          const senderName = sender?.displayName || 'Someone';
          await this.notifications.sendMessageNotification(
            member.userId,
            senderName,
            data.text || 'Sent a media message',
            data.chatId,
          );
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
    await this.redis.addSocket(userId, client.id);
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

    // Generate a shared LiveKit room name for both participants
    const livekitRoom = `call-${data.chatId}-${Date.now()}`;

    // BUG 2 FIX: Create call record in database
    let callRecord: any;
    try {
      callRecord = await this.callsService.initiateCall(userId, data.chatId, data.type);
    } catch (err) {
      console.error('Failed to create call record:', (err as Error).message);
    }

    // Send FCM push for incoming call (in case target is offline/backgrounded)
    const callerName = caller?.displayName || 'Someone';
    await this.notifications.sendCallNotification(
      data.targetUserId,
      callerName,
      data.type,
      data.chatId,
    );

    // Send incoming call to target with room name
    this.server.to(`user:${data.targetUserId}`).emit('call:incoming', {
      callerId: userId,
      callerName: caller?.displayName,
      callerPhoto: caller?.profilePhoto,
      chatId: data.chatId,
      type: data.type,
      livekitRoom,
      callId: callRecord?.id,
    });

    // Send room name back to caller so they know which room to join
    client.emit('call:room-ready', {
      chatId: data.chatId,
      targetUserId: data.targetUserId,
      livekitRoom,
      callId: callRecord?.id,
    });

    // BUG 1 FIX: Auto-timeout with cancellation support
    const timeoutKey = callRecord?.id || `${data.chatId}-${userId}`;
    const timeoutId = setTimeout(async () => {
      this.callTimeouts.delete(timeoutKey);
      this.server.to(`user:${data.targetUserId}`).emit('call:timeout', {
        callerId: userId,
        chatId: data.chatId,
        callId: callRecord?.id,
      });
      // Also notify caller
      client.emit('call:timeout', {
        chatId: data.chatId,
        targetUserId: data.targetUserId,
        callId: callRecord?.id,
      });
      // Create missed call message in chat
      if (callRecord) {
        try {
          await this.callsService.endCall(callRecord.id);
          await this.prisma.message.create({
            data: {
              chatId: data.chatId,
              senderId: userId,
              type: 'TEXT',
              text: `${data.type === 'VIDEO' ? 'Video' : 'Voice'} call - Missed`,
              status: 'SENT',
            },
          });
        } catch (e) {
          console.error('Failed to end timed-out call:', (e as Error).message);
        }
      }
    }, 45000);
    this.callTimeouts.set(timeoutKey, timeoutId);
  }

  @SubscribeMessage('call:answer')
  async handleCallAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callerId: string; chatId: string; livekitRoom?: string; callId?: string },
  ) {
    const userId = (client as any).userId;

    // BUG 1 FIX: Cancel the timeout when call is answered
    const timeoutKey = data.callId || `${data.chatId}-${data.callerId}`;
    const existingTimeout = this.callTimeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.callTimeouts.delete(timeoutKey);
    }

    // BUG 2 FIX: Update call record to ACTIVE
    if (data.callId) {
      try {
        await this.callsService.answerCall(data.callId, userId);
      } catch (e) {
        console.error('Failed to update call record:', (e as Error).message);
      }
    }

    this.server.to(`user:${data.callerId}`).emit('call:answered', {
      answererId: userId,
      chatId: data.chatId,
      livekitRoom: data.livekitRoom,
      callId: data.callId,
    });
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callerId: string; chatId: string; callId?: string },
  ) {
    const userId = (client as any).userId;

    // Cancel timeout on rejection too
    if (data.callId) {
      const existingTimeout = this.callTimeouts.get(data.callId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.callTimeouts.delete(data.callId);
      }
      try {
        await this.callsService.declineCall(data.callId, userId);
      } catch (e) {
        console.error('Failed to decline call record:', (e as Error).message);
      }
    }

    this.server.to(`user:${data.callerId}`).emit('call:rejected', {
      rejecterId: userId,
      chatId: data.chatId,
      callId: data.callId,
    });
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; chatId: string; callId?: string },
  ) {
    const userId = (client as any).userId;

    // BUG 1 FIX: Cancel any pending timeout for this call
    if (data.callId) {
      const existingTimeout = this.callTimeouts.get(data.callId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.callTimeouts.delete(data.callId);
      }
    }

    // BUG 2 FIX: End call record in database
    if (data.callId) {
      try {
        await this.callsService.endCall(data.callId);
      } catch (e) {
        console.error('Failed to end call record:', (e as Error).message);
      }
    }

    this.server.to(`user:${data.targetUserId}`).emit('call:ended', {
      enderId: userId,
      chatId: data.chatId,
      callId: data.callId,
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
