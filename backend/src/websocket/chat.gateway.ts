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
import { ChatsService } from '../chats/chats.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';

interface AuthSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // userId -> Set of socket IDs
  private connectedUsers = new Map<string, Set<string>>();
  // socketId -> userId
  private socketToUser = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private chatsService: ChatsService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    @InjectRepository(Device)
    private deviceRepo: Repository<Device>,
  ) {}

  async handleConnection(client: AuthSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        console.log(`[WS] Client ${client.id} - no token, disconnecting`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;

      const userId = client.userId!;

      // Track connection
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);
      this.socketToUser.set(client.id, userId);

      // Set user online
      await this.usersService.setOnline(userId, true);

      // Broadcast online status
      this.server.emit('user:online', { userId });

      console.log(`[WS] User ${userId} connected (socket: ${client.id})`);
    } catch (error: any) {
      console.log(`[WS] Auth failed for ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthSocket) {
    const userId = client.userId || this.socketToUser.get(client.id);
    if (!userId) return;

    const sockets = this.connectedUsers.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.connectedUsers.delete(userId);
        await this.usersService.setOnline(userId, false);
        this.server.emit('user:offline', { userId, lastSeen: new Date() });
      }
    }
    this.socketToUser.delete(client.id);
    console.log(`[WS] User ${userId} disconnected (socket: ${client.id})`);
  }

  // Emit to all sockets of a specific user
  private emitToUser(userId: string, event: string, data: any) {
    const sockets = this.connectedUsers.get(userId);
    if (sockets && this.server) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, data);
      }
      return true;
    }
    return false;
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { chatId: string; content: string; type?: string; tempId?: string },
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    try {
      const message = await this.chatsService.createMessage(
        data.chatId,
        client.userId,
        data.content,
        data.type || 'text',
      );

      // Get chat participants to send to
      const participants = await this.chatsService.getChatParticipants(data.chatId);

      for (const p of participants) {
        if (p.userId !== client.userId) {
          const delivered = this.emitToUser(p.userId, 'message:new', {
            ...message,
            tempId: data.tempId,
          });

          // If user is not online, update status to 'sent' (already default)
          // and send push notification
          if (!delivered) {
            this.notificationsService
              .sendMessageNotification(p.userId, client.userId, data.content, data.chatId)
              .catch((err) => console.warn('Push notification failed:', err.message));
          } else {
            // Mark as delivered since user is online
            await this.chatsService.updateMessageStatus(message.id, 'delivered');
            this.emitToUser(client.userId, 'message:status', {
              messageId: message.id,
              status: 'delivered',
            });
          }
        }
      }

      // Send confirmation back to sender
      return {
        success: true,
        message: {
          id: message.id,
          tempId: data.tempId,
          chatId: message.chatId,
          senderId: message.senderId,
          content: message.content,
          type: message.type,
          status: message.status,
          createdAt: message.createdAt,
        },
      };
    } catch (error) {
      console.error('Message send error:', error);
      return { error: 'Failed to send message' };
    }
  }

  @SubscribeMessage('message:read')
  async handleRead(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) return;

    await this.chatsService.markMessagesRead(data.chatId, client.userId);

    // Notify other participants
    const participants = await this.chatsService.getChatParticipants(data.chatId);
    for (const p of participants) {
      if (p.userId !== client.userId) {
        this.emitToUser(p.userId, 'message:read', {
          chatId: data.chatId,
          readBy: client.userId,
        });
      }
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) return;

    const participants = await this.chatsService.getChatParticipants(data.chatId);
    for (const p of participants) {
      if (p.userId !== client.userId) {
        this.emitToUser(p.userId, 'typing:start', {
          chatId: data.chatId,
          userId: client.userId,
        });
      }
    }
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) return;

    const participants = await this.chatsService.getChatParticipants(data.chatId);
    for (const p of participants) {
      if (p.userId !== client.userId) {
        this.emitToUser(p.userId, 'typing:stop', {
          chatId: data.chatId,
          userId: client.userId,
        });
      }
    }
  }

  // Call signaling — PeerJS handles media, we just relay peer IDs and call metadata
  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { targetUserId: string; callType: 'audio' | 'video'; peerId: string; chatId?: string },
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const caller = await this.usersService.findById(client.userId);

    const delivered = this.emitToUser(data.targetUserId, 'call:incoming', {
      callerId: client.userId,
      callerName: caller.displayName || caller.phone,
      callerPhoto: caller.profilePhoto,
      callType: data.callType,
      peerId: data.peerId,
      chatId: data.chatId,
    });

    if (!delivered) {
      // User offline — send push notification
      this.notificationsService
        .sendCallNotification(data.targetUserId, caller.displayName || caller.phone, data.callType)
        .catch((err) => console.warn('Call push failed:', err.message));
    }

    console.log(`[Call] ${client.userId} -> ${data.targetUserId} (${data.callType}), delivered=${delivered}`);
    return { success: true, delivered };
  }

  @SubscribeMessage('call:answer')
  async handleCallAnswer(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { targetUserId: string; peerId: string },
  ) {
    if (!client.userId) return;
    this.emitToUser(data.targetUserId, 'call:answered', {
      answererId: client.userId,
      peerId: data.peerId,
    });
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { targetUserId: string; reason?: string },
  ) {
    if (!client.userId) return;
    this.emitToUser(data.targetUserId, 'call:rejected', {
      userId: client.userId,
      reason: data.reason || 'rejected',
    });
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { targetUserId: string },
  ) {
    if (!client.userId) return;
    this.emitToUser(data.targetUserId, 'call:ended', {
      userId: client.userId,
    });
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: AuthSocket) {
    return { timestamp: Date.now() };
  }
}
