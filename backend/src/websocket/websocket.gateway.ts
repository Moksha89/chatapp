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
import { Inject, forwardRef, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { WebsocketService } from './websocket.service';
import { ChatsService } from '../chats/chats.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

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

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(
    private readonly websocketService: WebsocketService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => ChatsService))
    private readonly chatsService: ChatsService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
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
      
      // Bug #2 fix: Send push notifications to offline participants
      const sender = await this.usersService.findById(client.userId);
      const senderName = sender?.displayName || sender?.phoneNumber || 'Unknown';

      for (const participantId of participants) {
        this.websocketService.emitToUser(participantId, 'message:new', {
          message,
          chatId: data.chatId,
        });

        // Send push notification if user is not currently connected
        if (!this.websocketService.isUserOnline(participantId)) {
          this.notificationsService.sendMessageNotification(
            participantId,
            senderName,
            data.content,
            data.chatId,
            data.type || 'text',
          ).catch(err => this.logger.warn(`Push notification failed: ${err.message}`));
        }
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

  // Group Call Support — server-side tracking for mesh networking
  private activeGroupCalls: Map<string, {
    chatId: string;
    callType: 'audio' | 'video';
    initiatorId: string;
    participants: Set<string>;
    createdAt: Date;
  }> = new Map();

  @SubscribeMessage('call:group:initiate')
  async handleGroupCallInitiate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; callType: 'audio' | 'video' },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    const callId = `gcall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const caller = await this.usersService.findById(client.userId);
    const chatParticipants = await this.chatsService.getOtherParticipants(data.chatId, client.userId);

    // Track active group call with initiator as first participant
    this.activeGroupCalls.set(callId, {
      chatId: data.chatId,
      callType: data.callType,
      initiatorId: client.userId,
      participants: new Set([client.userId]),
      createdAt: new Date(),
    });

    // Notify all other chat members about the incoming group call
    for (const participantId of chatParticipants) {
      this.websocketService.emitToUser(participantId, 'call:group:incoming', {
        callId,
        chatId: data.chatId,
        callerId: client.userId,
        callerName: caller?.displayName || 'Unknown',
        callType: data.callType,
        participants: [client.userId, ...chatParticipants],
      });
    }

    console.log(`Group call initiated: ${callId} in chat ${data.chatId} by ${client.userId}`);
    return { success: true, callId, participants: [client.userId, ...chatParticipants] };
  }

  @SubscribeMessage('call:group:join')
  async handleGroupCallJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; chatId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    const groupCall = this.activeGroupCalls.get(data.callId);
    if (!groupCall) {
      return { error: 'Group call not found or ended' };
    }

    // Get existing participants before adding the new one
    const existingParticipants = Array.from(groupCall.participants);
    groupCall.participants.add(client.userId);

    // Notify existing participants that a new peer joined — they each need to create a peer connection
    for (const participantId of existingParticipants) {
      this.websocketService.emitToUser(participantId, 'call:group:participant-joined', {
        callId: data.callId,
        userId: client.userId,
        existingPeers: existingParticipants.filter(id => id !== participantId),
      });
    }

    // Tell the joining user who is already in the call so they can create peer connections
    client.emit('call:group:peers', {
      callId: data.callId,
      peers: existingParticipants,
    });

    console.log(`User ${client.userId} joined group call ${data.callId} (${groupCall.participants.size} participants)`);
    return { success: true, peers: existingParticipants };
  }

  // Per-peer offer for mesh networking (each participant pair creates a peer connection)
  @SubscribeMessage('call:group:offer')
  async handleGroupCallOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; targetUserId: string; offer: RTCSessionDescriptionInit },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    this.websocketService.emitToUser(data.targetUserId, 'call:group:offer', {
      callId: data.callId,
      fromUserId: client.userId,
      offer: data.offer,
    });

    return { success: true };
  }

  // Per-peer answer for mesh networking
  @SubscribeMessage('call:group:answer')
  async handleGroupCallAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; targetUserId: string; answer: RTCSessionDescriptionInit },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    this.websocketService.emitToUser(data.targetUserId, 'call:group:answer', {
      callId: data.callId,
      fromUserId: client.userId,
      answer: data.answer,
    });

    return { success: true };
  }

  // Per-peer ICE candidate exchange for mesh networking
  @SubscribeMessage('call:group:ice-candidate')
  async handleGroupCallIceCandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; targetUserId: string; candidate: RTCIceCandidateInit },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    this.websocketService.emitToUser(data.targetUserId, 'call:group:ice-candidate', {
      callId: data.callId,
      fromUserId: client.userId,
      candidate: data.candidate,
    });

    return { success: true };
  }

  @SubscribeMessage('call:group:leave')
  async handleGroupCallLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; chatId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    const groupCall = this.activeGroupCalls.get(data.callId);
    if (groupCall) {
      groupCall.participants.delete(client.userId);

      // Notify remaining participants to close their peer connection with the leaving user
      for (const participantId of groupCall.participants) {
        this.websocketService.emitToUser(participantId, 'call:group:participant-left', {
          callId: data.callId,
          userId: client.userId,
        });
      }

      // Clean up if no participants remain
      if (groupCall.participants.size === 0) {
        this.activeGroupCalls.delete(data.callId);
        console.log(`Group call ${data.callId} ended — no participants remaining`);
      } else {
        console.log(`User ${client.userId} left group call ${data.callId} (${groupCall.participants.size} remaining)`);
      }
    }

    return { success: true };
  }

  // Bug #5 fix: Cron job to delete expired disappearing messages (runs every 60 seconds)
  @Interval(60000)
  async handleDisappearingMessagesCron() {
    try {
      const deleted = await this.chatsService.cleanupExpiredMessages();
      if (deleted > 0) {
        this.logger.log(`Cleaned up ${deleted} expired disappearing messages`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired messages:', error);
    }
  }

  // Proxy Support for Calls
  @SubscribeMessage('call:proxy:configure')
  async handleProxyConfigure(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { enabled: boolean; proxyServer?: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    // Store proxy configuration for the user's calls
    // When enabled, ICE candidates will be relayed through TURN servers
    const iceServers = data.enabled && data.proxyServer
      ? [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: `turn:${data.proxyServer}`, username: 'proxy', credential: 'proxy' },
        ]
      : [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ];

    client.emit('call:proxy:configured', {
      enabled: data.enabled,
      iceServers,
    });

    console.log(`Proxy ${data.enabled ? 'enabled' : 'disabled'} for user ${client.userId}`);
    return { success: true, iceServers };
  }

  // View-once message viewed notification
  @SubscribeMessage('message:view-once:viewed')
  async handleViewOnceViewed(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; messageId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const message = await this.chatsService.markViewOnceViewed(data.chatId, client.userId, data.messageId);
      
      this.websocketService.emitToUser(message.senderId, 'message:view-once:opened', {
        chatId: data.chatId,
        messageId: data.messageId,
        viewedBy: client.userId,
      });

      return { success: true };
    } catch (error) {
      console.error('View-once error:', error);
      return { error: 'Failed to mark view-once message' };
    }
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
