import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Inject, forwardRef } from '@nestjs/common';
import { WebsocketService } from './websocket.service';
import { ChatsService } from '../chats/chats.service';
import { UsersService } from '../users/users.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  deviceId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/chat',
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly websocketService: WebsocketService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => ChatsService))
    private readonly chatsService: ChatsService,
    private readonly usersService: UsersService,
  ) {}

  afterInit(server: Server) {
    this.websocketService.setServer(server);
    console.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.deviceId = payload.deviceId;

      if (client.userId) {
        this.websocketService.addConnection(client.userId, client.id, client.deviceId);
        await this.usersService.updateLastSeen(client.userId);
        this.broadcastPresence(client.userId, true);
      }

      console.log(`Client connected: ${client.id} (User: ${client.userId})`);
    } catch (error) {
      console.error('Connection error:', error);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.websocketService.removeConnection(client.id);
      
      if (!this.websocketService.isUserOnline(client.userId)) {
        this.broadcastPresence(client.userId, false);
        this.usersService.updateLastSeen(client.userId);
      }
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; content: string; ciphertext?: string; type?: string; tempId?: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const message = await this.chatsService.sendMessage(
        data.chatId,
        client.userId,
        client.deviceId,
        {
          content: data.content,
          ciphertext: data.ciphertext,
          type: data.type as 'text' | 'image' | 'file' | 'audio',
          tempId: data.tempId,
        },
      );

      client.emit('message:sent', {
        tempId: data.tempId,
        messageId: message.id,
        timestamp: message.createdAt,
      });

      const participants = await this.chatsService.getOtherParticipants(data.chatId, client.userId);
      
      for (const participantId of participants) {
        this.websocketService.emitToUser(participantId, 'message:new', {
          message,
          chatId: data.chatId,
        });
      }

      return { success: true, messageId: message.id };
    } catch (error) {
      console.error('Send message error:', error);
      return { error: 'Failed to send message' };
    }
  }

  @SubscribeMessage('message:delivered')
  async handleMessageDelivered(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const message = await this.chatsService.markMessageDelivered(data.messageId);
      
      this.websocketService.emitToUser(message.senderId, 'message:delivered', {
        messageId: message.id,
        deliveredAt: message.deliveredAt,
      });

      return { success: true };
    } catch (error) {
      console.error('Message delivered error:', error);
      return { error: 'Failed to mark message as delivered' };
    }
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; messageIds: string[] },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      await this.chatsService.markMessagesRead(data.chatId, client.userId, data.messageIds);
      
      const participants = await this.chatsService.getOtherParticipants(data.chatId, client.userId);
      
      for (const participantId of participants) {
        this.websocketService.emitToUser(participantId, 'message:read', {
          chatId: data.chatId,
          messageIds: data.messageIds,
          readAt: new Date(),
          readBy: client.userId,
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Message read error:', error);
      return { error: 'Failed to mark messages as read' };
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    this.websocketService.setTyping(data.chatId, client.userId, true);
    
    const participants = await this.chatsService.getOtherParticipants(data.chatId, client.userId);
    
    for (const participantId of participants) {
      this.websocketService.emitToUser(participantId, 'typing:indicator', {
        chatId: data.chatId,
        oderId: client.userId,
        isTyping: true,
      });
    }

    return { success: true };
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    this.websocketService.setTyping(data.chatId, client.userId, false);
    
    const participants = await this.chatsService.getOtherParticipants(data.chatId, client.userId);
    
    for (const participantId of participants) {
      this.websocketService.emitToUser(participantId, 'typing:indicator', {
        chatId: data.chatId,
        userId: client.userId,
        isTyping: false,
      });
    }

    return { success: true };
  }

  @SubscribeMessage('presence:online')
  handlePresenceOnline(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    this.broadcastPresence(client.userId, true);
    return { success: true };
  }

  @SubscribeMessage('presence:offline')
  handlePresenceOffline(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    this.broadcastPresence(client.userId, false);
    return { success: true };
  }

  private broadcastPresence(userId: string, isOnline: boolean) {
    this.server.emit('presence:update', {
      userId,
      status: isOnline ? 'online' : 'offline',
      lastSeen: isOnline ? null : new Date(),
    });
  }
}
