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
import { Inject, forwardRef, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { WebsocketService } from './websocket.service';
import { ChatsService } from '../chats/chats.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CallsService } from '../calls/calls.service';
import { DatabaseService } from '../database/database.service';

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
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
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
    private readonly callsService: CallsService,
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        const { createAdapter } = await import('@socket.io/redis-adapter');
        const { Redis } = await import('ioredis');
        const pubClient = new Redis(redisUrl);
        const subClient = pubClient.duplicate();
        this.server?.adapter(createAdapter(pubClient, subClient) as never);
        this.logger.log('Redis adapter configured for Socket.IO scaling');
      } catch (err) {
        this.logger.warn(`Redis adapter not available, using in-memory: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  afterInit(server: Server) {
    this.websocketService.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
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

        // Deliver any pending messages queued while the user was offline
        // (handled automatically by addConnection in websocketService)
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

  // Heartbeat handler — client sends this periodically to stay "alive"
  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }
    this.websocketService.updateHeartbeat(client.userId);
    return { success: true };
  }

  // Heartbeat check — runs every 30 seconds, disconnects stale users (no heartbeat in 60s)
  @Interval(30000)
  async handleHeartbeatCheck() {
    const staleUsers = this.websocketService.getStaleUsers();
    for (const userId of staleUsers) {
      this.websocketService.removeAllConnectionsForUser(userId);
      this.broadcastPresence(userId, false);
      await this.usersService.updateLastSeen(userId);
      this.logger.log(`Disconnected stale user: ${userId}`);
    }
  }

  private broadcastPresence(userId: string, isOnline: boolean) {
    this.server.emit('presence:update', {
      userId,
      status: isOnline ? 'online' : 'offline',
      lastSeen: isOnline ? null : new Date(),
    });
  }

  // ==================== ENHANCED CALLING SYSTEM (with DB records) ====================

  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: string; callType: 'audio' | 'video'; offer: RTCSessionDescriptionInit; chatId?: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      // Check if caller is blocked by target user
      const isBlocked = await this.chatsService.isUserBlocked(data.targetUserId, client.userId);
      if (isBlocked) {
        return { error: 'Cannot call this user' };
      }

      // Create call record in DB with participant tracking
      const call = await this.callsService.initiateCall(client.userId, {
        receiverId: data.targetUserId,
        chatId: data.chatId,
        callType: data.callType,
        callMode: 'direct',
      });

      const caller = await this.usersService.findById(client.userId);

      // Send call offer to target user
      this.websocketService.emitToUser(data.targetUserId, 'call:incoming', {
        callId: call.id,
        callerId: client.userId,
        callerName: caller?.displayName || 'Unknown',
        callerPhoto: caller?.profilePhoto || null,
        callType: data.callType,
        offer: data.offer,
      });

      this.logger.log(`Call initiated: ${call.id} from ${client.userId} to ${data.targetUserId}`);
      return { success: true, callId: call.id };
    } catch (error) {
      this.logger.error('Call initiate error:', error);
      return { error: error instanceof Error ? error.message : 'Failed to initiate call' };
    }
  }

  @SubscribeMessage('call:answer')
  async handleCallAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; targetUserId: string; answer: RTCSessionDescriptionInit },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      await this.callsService.answerCall(data.callId, client.userId);

      this.websocketService.emitToUser(data.targetUserId, 'call:answered', {
        callId: data.callId,
        answer: data.answer,
      });

      this.logger.log(`Call answered: ${data.callId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Call answer error:', error);
      return { error: error instanceof Error ? error.message : 'Failed to answer call' };
    }
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; targetUserId: string; reason?: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const call = await this.callsService.declineCall(data.callId, client.userId);

      this.websocketService.emitToUser(data.targetUserId, 'call:rejected', {
        callId: data.callId,
        reason: data.reason || 'Call rejected',
      });

      // Create call message in chat if chatId exists
      if (call.chatId) {
        const callMsg = `${call.callType === 'video' ? 'Video call' : 'Voice call'} - Declined`;
        await this.callsService.createCallMessage(call.id, call.chatId, call.initiatorId, callMsg);
      }

      this.logger.log(`Call rejected: ${data.callId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Call reject error:', error);
      return { error: error instanceof Error ? error.message : 'Failed to reject call' };
    }
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; targetUserId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const result = await this.callsService.endCall(data.callId, client.userId);

      this.websocketService.emitToUser(data.targetUserId, 'call:ended', {
        callId: data.callId,
        duration: result.duration,
        callMessage: result.callMessage,
      });

      // Create call message in chat
      if (result.chatId) {
        await this.callsService.createCallMessage(result.id, result.chatId, result.initiatorId, result.callMessage);

        // Notify chat participants about the call message
        const chatParticipants = await this.chatsService.getOtherParticipants(result.chatId, client.userId);
        for (const pid of chatParticipants) {
          this.websocketService.emitToUser(pid, 'message:new', {
            chatId: result.chatId,
            message: { type: 'call', content: result.callMessage },
          });
        }
      }

      this.logger.log(`Call ended: ${data.callId} (duration: ${result.duration}s)`);
      return { success: true, duration: result.duration, callMessage: result.callMessage };
    } catch (error) {
      this.logger.error('Call end error:', error);
      return { error: error instanceof Error ? error.message : 'Failed to end call' };
    }
  }

  // Mute/unmute audio during call
  @SubscribeMessage('call:mute')
  async handleCallMute(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string },
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    try {
      const participant = await this.callsService.toggleMute(data.callId, client.userId);
      // Notify all other call participants
      const callParticipants = await this.databaseService.getActiveCallParticipants(data.callId);
      for (const cp of callParticipants) {
        if (cp.userId !== client.userId) {
          this.websocketService.emitToUser(cp.userId, 'call:participant:muted', {
            callId: data.callId,
            userId: client.userId,
            isMuted: participant.isMuted,
          });
        }
      }
      return { success: true, isMuted: participant.isMuted };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to toggle mute' };
    }
  }

  // Toggle video during call
  @SubscribeMessage('call:video:toggle')
  async handleCallVideoToggle(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string },
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    try {
      const participant = await this.callsService.toggleVideo(data.callId, client.userId);
      const callParticipants = await this.databaseService.getActiveCallParticipants(data.callId);
      for (const cp of callParticipants) {
        if (cp.userId !== client.userId) {
          this.websocketService.emitToUser(cp.userId, 'call:participant:video', {
            callId: data.callId,
            userId: client.userId,
            isVideoEnabled: participant.isVideoEnabled,
          });
        }
      }
      return { success: true, isVideoEnabled: participant.isVideoEnabled };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to toggle video' };
    }
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

  // Group Call Support — DB-backed tracking + mesh networking
  private activeGroupCalls: Map<string, {
    chatId: string;
    callType: 'audio' | 'video';
    initiatorId: string;
    participants: Set<string>;
    dbCallId: string;
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

    try {
      // Create call record in DB
      const call = await this.callsService.initiateCall(client.userId, {
        chatId: data.chatId,
        callType: data.callType,
        callMode: 'group',
      });

      const caller = await this.usersService.findById(client.userId);
      const chatParticipants = await this.chatsService.getOtherParticipants(data.chatId, client.userId);

      this.activeGroupCalls.set(call.id, {
        chatId: data.chatId,
        callType: data.callType,
        initiatorId: client.userId,
        participants: new Set([client.userId]),
        dbCallId: call.id,
        createdAt: new Date(),
      });

      for (const participantId of chatParticipants) {
        this.websocketService.emitToUser(participantId, 'call:group:incoming', {
          callId: call.id,
          chatId: data.chatId,
          callerId: client.userId,
          callerName: caller?.displayName || 'Unknown',
          callerPhoto: caller?.profilePhoto || null,
          callType: data.callType,
          participants: [client.userId, ...chatParticipants],
        });
      }

      this.logger.log(`Group call initiated: ${call.id} in chat ${data.chatId}`);
      return { success: true, callId: call.id, participants: [client.userId, ...chatParticipants] };
    } catch (error) {
      this.logger.error('Group call initiate error:', error);
      return { error: error instanceof Error ? error.message : 'Failed to initiate group call' };
    }
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

    try {
      // Update DB participant record
      await this.callsService.answerCall(data.callId, client.userId);
    } catch {
      // Already joined or not invited — proceed anyway for mesh
    }

    const existingParticipants = Array.from(groupCall.participants);
    groupCall.participants.add(client.userId);

    for (const participantId of existingParticipants) {
      this.websocketService.emitToUser(participantId, 'call:group:participant-joined', {
        callId: data.callId,
        userId: client.userId,
        existingPeers: existingParticipants.filter(id => id !== participantId),
      });
    }

    client.emit('call:group:peers', {
      callId: data.callId,
      peers: existingParticipants,
    });

    this.logger.log(`User ${client.userId} joined group call ${data.callId} (${groupCall.participants.size} participants)`);
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

    // Update DB
    try {
      await this.callsService.leaveCall(data.callId, client.userId);
    } catch {
      // Ignore if not found
    }

    const groupCall = this.activeGroupCalls.get(data.callId);
    if (groupCall) {
      groupCall.participants.delete(client.userId);

      for (const participantId of groupCall.participants) {
        this.websocketService.emitToUser(participantId, 'call:group:participant-left', {
          callId: data.callId,
          userId: client.userId,
        });
      }

      if (groupCall.participants.size === 0) {
        this.activeGroupCalls.delete(data.callId);

        // End call in DB and create call message
        try {
          const result = await this.callsService.endCall(data.callId, client.userId);
          if (result.chatId) {
            await this.callsService.createCallMessage(result.id, result.chatId, result.initiatorId, result.callMessage);
          }
        } catch {
          // Ignore
        }

        this.logger.log(`Group call ${data.callId} ended — no participants remaining`);
      } else {
        this.logger.log(`User ${client.userId} left group call ${data.callId} (${groupCall.participants.size} remaining)`);
      }
    }

    return { success: true };
  }

  // Add participant to active group call
  @SubscribeMessage('call:group:add-participant')
  async handleGroupCallAddParticipant(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; targetUserId: string },
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    try {
      await this.callsService.addParticipant(data.callId, client.userId, data.targetUserId);
      const caller = await this.usersService.findById(client.userId);
      const groupCall = this.activeGroupCalls.get(data.callId);

      this.websocketService.emitToUser(data.targetUserId, 'call:group:incoming', {
        callId: data.callId,
        chatId: groupCall?.chatId,
        callerId: client.userId,
        callerName: caller?.displayName || 'Unknown',
        callType: groupCall?.callType || 'audio',
        participants: groupCall ? Array.from(groupCall.participants) : [],
      });

      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to add participant' };
    }
  }

  // ==================== PER-RECIPIENT MESSAGE STATUS ====================

  @SubscribeMessage('message:status:delivered')
  async handleMessageStatusDelivered(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; chatId: string },
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    try {
      // Update per-recipient status
      const existingStatus = await this.databaseService.findMessageStatus(data.messageId, client.userId);
      if (existingStatus) {
        await this.databaseService.updateMessageStatus(existingStatus.id, {
          status: 'delivered',
          deliveredAt: new Date(),
        });
      } else {
        await this.databaseService.createMessageStatus({
          messageId: data.messageId,
          userId: client.userId,
          status: 'delivered',
          deliveredAt: new Date(),
          seenAt: null,
        });
      }

      // Check if ALL recipients have delivered — if so, update message status
      const message = await this.databaseService.findMessageById(data.messageId);
      if (message) {
        const allDelivered = await this.databaseService.areAllRecipientsStatus(
          data.messageId, 'delivered', message.senderId,
        );
        if (allDelivered) {
          await this.databaseService.updateMessage(data.messageId, {
            status: 'delivered',
            deliveredAt: new Date(),
          });
          this.websocketService.emitToUser(message.senderId, 'message:delivered', {
            messageId: data.messageId,
            deliveredAt: new Date(),
          });
        }
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Message status delivered error:', error);
      return { error: 'Failed to update message status' };
    }
  }

  @SubscribeMessage('message:status:seen')
  async handleMessageStatusSeen(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageIds: string[]; chatId: string },
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    try {
      for (const messageId of data.messageIds) {
        const existingStatus = await this.databaseService.findMessageStatus(messageId, client.userId);
        if (existingStatus) {
          await this.databaseService.updateMessageStatus(existingStatus.id, {
            status: 'seen',
            seenAt: new Date(),
            deliveredAt: existingStatus.deliveredAt || new Date(),
          });
        } else {
          await this.databaseService.createMessageStatus({
            messageId,
            userId: client.userId,
            status: 'seen',
            deliveredAt: new Date(),
            seenAt: new Date(),
          });
        }

        // Check if ALL recipients have seen — if so, update message status to 'read'
        const message = await this.databaseService.findMessageById(messageId);
        if (message) {
          const allSeen = await this.databaseService.areAllRecipientsStatus(
            messageId, 'seen', message.senderId,
          );
          if (allSeen) {
            await this.databaseService.updateMessage(messageId, {
              status: 'read',
              readAt: new Date(),
            });
            this.websocketService.emitToUser(message.senderId, 'message:read', {
              chatId: data.chatId,
              messageIds: [messageId],
              readAt: new Date(),
              readBy: client.userId,
            });
          }
        }
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Message status seen error:', error);
      return { error: 'Failed to update message status' };
    }
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
      return { error: error instanceof Error ? error.message : 'Failed to edit message' };
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
      return { error: error instanceof Error ? error.message : 'Failed to delete message' };
    }
  }
}
