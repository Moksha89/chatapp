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
    @MessageBody() data: { chatId: string; content: string; ciphertext?: string; type?: string; tempId?: string; replyToMessageId?: string },
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
          replyToMessageId: data.replyToMessageId,
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
      const { shouldEmitReadReceipts } = await this.chatsService.markMessagesRead(data.chatId, client.userId, data.messageIds);
      
      // Only emit read receipts if the reader has them enabled in privacy settings
      if (shouldEmitReadReceipts) {
        const participants = await this.chatsService.getOtherParticipants(data.chatId, client.userId);
        
        for (const participantId of participants) {
          this.websocketService.emitToUser(participantId, 'message:read', {
            chatId: data.chatId,
            messageIds: data.messageIds,
            readAt: new Date(),
            readBy: client.userId,
          });
        }
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
        userId: client.userId,
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

  // WebRTC Signaling for Voice/Video Calls
  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: string; callType: 'audio' | 'video'; offer: RTCSessionDescriptionInit },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    // Check if caller is blocked by target user
    const isBlocked = await this.chatsService.isUserBlocked(data.targetUserId, client.userId);
    if (isBlocked) {
      return { error: 'Cannot call this user' };
    }

    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const caller = await this.usersService.findById(client.userId);

    // Send call offer to target user
    this.websocketService.emitToUser(data.targetUserId, 'call:incoming', {
      callId,
      callerId: client.userId,
      callerName: caller?.displayName || 'Unknown',
      callType: data.callType,
      offer: data.offer,
    });

    console.log(`Call initiated: ${callId} from ${client.userId} to ${data.targetUserId}`);
    return { success: true, callId };
  }

  @SubscribeMessage('call:answer')
  async handleCallAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; targetUserId: string; answer: RTCSessionDescriptionInit },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    // Send answer back to caller
    this.websocketService.emitToUser(data.targetUserId, 'call:answered', {
      callId: data.callId,
      answer: data.answer,
    });

    console.log(`Call answered: ${data.callId}`);
    return { success: true };
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; targetUserId: string; reason?: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    this.websocketService.emitToUser(data.targetUserId, 'call:rejected', {
      callId: data.callId,
      reason: data.reason || 'Call rejected',
    });

    console.log(`Call rejected: ${data.callId}`);
    return { success: true };
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; targetUserId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    this.websocketService.emitToUser(data.targetUserId, 'call:ended', {
      callId: data.callId,
    });

    console.log(`Call ended: ${data.callId}`);
    return { success: true };
  }

  @SubscribeMessage('call:ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; targetUserId: string; candidate: RTCIceCandidateInit },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    this.websocketService.emitToUser(data.targetUserId, 'call:ice-candidate', {
      callId: data.callId,
      candidate: data.candidate,
    });

    return { success: true };
  }

  // Message Reactions
  @SubscribeMessage('message:reaction:add')
  async handleAddReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; messageId: string; emoji: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const message = await this.chatsService.addReaction(data.chatId, client.userId, data.messageId, data.emoji);
      
      const participants = await this.chatsService.getOtherParticipants(data.chatId, client.userId);
      
      for (const participantId of participants) {
        this.websocketService.emitToUser(participantId, 'message:reaction:updated', {
          chatId: data.chatId,
          messageId: data.messageId,
          reactions: message.reactions,
          userId: client.userId,
          emoji: data.emoji,
          action: 'add',
        });
      }

      return { success: true, reactions: message.reactions };
    } catch (error) {
      console.error('Add reaction error:', error);
      return { error: 'Failed to add reaction' };
    }
  }

  @SubscribeMessage('message:reaction:remove')
  async handleRemoveReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; messageId: string; emoji: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const message = await this.chatsService.removeReaction(data.chatId, client.userId, data.messageId, data.emoji);
      
      const participants = await this.chatsService.getOtherParticipants(data.chatId, client.userId);
      
      for (const participantId of participants) {
        this.websocketService.emitToUser(participantId, 'message:reaction:updated', {
          chatId: data.chatId,
          messageId: data.messageId,
          reactions: message.reactions,
          userId: client.userId,
          emoji: data.emoji,
          action: 'remove',
        });
      }

      return { success: true, reactions: message.reactions };
    } catch (error) {
      console.error('Remove reaction error:', error);
      return { error: 'Failed to remove reaction' };
    }
  }

  // Edit Message
  @SubscribeMessage('message:edit')
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; messageId: string; content: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const message = await this.chatsService.editMessage(data.chatId, client.userId, data.messageId, data.content);
      
      const participants = await this.chatsService.getOtherParticipants(data.chatId, client.userId);
      
      for (const participantId of participants) {
        this.websocketService.emitToUser(participantId, 'message:edited', {
          chatId: data.chatId,
          messageId: data.messageId,
          content: message.content,
          isEdited: true,
          editedAt: message.editedAt,
        });
      }

      return { success: true, message };
    } catch (error) {
      console.error('Edit message error:', error);
      return { error: error.message || 'Failed to edit message' };
    }
  }

  // Delete Message
  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; messageId: string; deleteForEveryone: boolean },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const message = await this.chatsService.deleteMessage(data.chatId, client.userId, data.messageId, data.deleteForEveryone);
      
      if (data.deleteForEveryone) {
        const participants = await this.chatsService.getOtherParticipants(data.chatId, client.userId);
        
        for (const participantId of participants) {
          this.websocketService.emitToUser(participantId, 'message:deleted', {
            chatId: data.chatId,
            messageId: data.messageId,
            isDeleted: true,
            content: message.content,
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Delete message error:', error);
      return { error: error.message || 'Failed to delete message' };
    }
  }
}
