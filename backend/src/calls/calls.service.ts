import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService, Call, CallParticipant } from '../database/database.service';

@Injectable()
export class CallsService {
  // H9: Mutex to prevent race conditions in endCall
  private endCallLocks: Set<string> = new Set();

  constructor(private readonly databaseService: DatabaseService) {}

  async initiateCall(
    initiatorId: string,
    data: { receiverId?: string; chatId?: string; callType: 'audio' | 'video'; callMode?: 'direct' | 'group' },
  ): Promise<Call & { participants: CallParticipant[] }> {
    // Check if initiator already has an active call
    const activeCall = await this.databaseService.getActiveCallForUser(initiatorId);
    if (activeCall) {
      throw new BadRequestException('You already have an active call');
    }

    const callMode = data.callMode || 'direct';
    
    const call = await this.databaseService.createCall({
      initiatorId,
      receiverId: data.receiverId || null,
      chatId: data.chatId || null,
      callType: data.callType,
      callMode,
      status: 'ringing',
      startedAt: null,
      endedAt: null,
      duration: null,
      maxParticipants: callMode === 'group' ? 10 : 2,
    });

    // Create participant for initiator
    await this.databaseService.createCallParticipant({
      callId: call.id,
      userId: initiatorId,
      status: 'joined',
      joinedAt: new Date(),
      leftAt: null,
      isMuted: false,
      isVideoEnabled: data.callType === 'video',
    });

    // Create participant for receiver (direct call)
    if (data.receiverId && callMode === 'direct') {
      await this.databaseService.createCallParticipant({
        callId: call.id,
        userId: data.receiverId,
        status: 'invited',
        joinedAt: null,
        leftAt: null,
        isMuted: false,
        isVideoEnabled: data.callType === 'video',
      });
    }

    // For group calls, invite all chat participants
    if (callMode === 'group' && data.chatId) {
      const chatParticipants = await this.databaseService.findChatParticipantsByChatId(data.chatId);
      for (const cp of chatParticipants) {
        if (cp.userId !== initiatorId) {
          await this.databaseService.createCallParticipant({
            callId: call.id,
            userId: cp.userId,
            status: 'invited',
            joinedAt: null,
            leftAt: null,
            isMuted: false,
            isVideoEnabled: data.callType === 'video',
          });
        }
      }
    }

    const participants = await this.databaseService.findCallParticipantsByCallId(call.id);
    return { ...call, participants };
  }

  async answerCall(callId: string, userId: string): Promise<Call & { participants: CallParticipant[] }> {
    const call = await this.databaseService.findCallById(callId);
    if (!call) throw new NotFoundException('Call not found');
    if (call.status !== 'ringing' && call.status !== 'active') {
      throw new BadRequestException('Call is no longer available');
    }

    const participant = await this.databaseService.findCallParticipant(callId, userId);
    if (!participant) throw new ForbiddenException('Not authorized for this call');
    if (participant.status !== 'invited') {
      throw new BadRequestException('Already responded to this call');
    }

    await this.databaseService.updateCallParticipant(participant.id, {
      status: 'joined',
      joinedAt: new Date(),
    });

    // If call is still ringing, mark it as active
    if (call.status === 'ringing') {
      await this.databaseService.updateCall(callId, {
        status: 'active',
        startedAt: new Date(),
      });
    }

    const updatedCall = await this.databaseService.findCallById(callId);
    const participants = await this.databaseService.findCallParticipantsByCallId(callId);
    return { ...updatedCall!, participants };
  }

  async declineCall(callId: string, userId: string): Promise<Call> {
    const call = await this.databaseService.findCallById(callId);
    if (!call) throw new NotFoundException('Call not found');

    const participant = await this.databaseService.findCallParticipant(callId, userId);
    if (!participant) throw new ForbiddenException('Not authorized for this call');

    await this.databaseService.updateCallParticipant(participant.id, {
      status: 'declined',
    });

    // For direct calls, if the receiver declines, end the call
    if (call.callMode === 'direct') {
      const now = new Date();
      await this.databaseService.updateCall(callId, {
        status: 'declined',
        endedAt: now,
        duration: 0,
      });
    }

    return (await this.databaseService.findCallById(callId))!;
  }

  async endCall(callId: string, userId: string): Promise<Call & { callMessage: string }> {
    // H9: Prevent race condition with lock
    if (this.endCallLocks.has(callId)) {
      // Another endCall is already in progress for this call — wait briefly and return current state
      const call = await this.databaseService.findCallById(callId);
      if (!call) throw new NotFoundException('Call not found');
      return { ...call, callMessage: this.formatCallMessage(call, call.duration || 0) };
    }
    this.endCallLocks.add(callId);

    try {
      const call = await this.databaseService.findCallById(callId);
      if (!call) throw new NotFoundException('Call not found');

      // If already ended, return immediately
      if (call.status === 'ended') {
        return { ...call, callMessage: this.formatCallMessage(call, call.duration || 0) };
      }

      const now = new Date();
      let duration = 0;
      if (call.startedAt) {
        duration = Math.floor((now.getTime() - new Date(call.startedAt).getTime()) / 1000);
      }

      // Mark all active participants as left
      const participants = await this.databaseService.findCallParticipantsByCallId(callId);
      for (const p of participants) {
        if (p.status === 'joined' || p.status === 'invited') {
          const newStatus = p.status === 'invited' ? 'missed' : 'left';
          await this.databaseService.updateCallParticipant(p.id, {
            status: newStatus,
            leftAt: now,
          });
        }
      }

      await this.databaseService.updateCall(callId, {
        status: 'ended',
        endedAt: now,
        duration,
      });

      const callMessage = this.formatCallMessage(call, duration);
      const updatedCall = await this.databaseService.findCallById(callId);
      return { ...updatedCall!, callMessage };
    } finally {
      this.endCallLocks.delete(callId);
    }
  }

  async leaveCall(callId: string, userId: string): Promise<Call> {
    const call = await this.databaseService.findCallById(callId);
    if (!call) throw new NotFoundException('Call not found');

    // M11: If already ended, don't trigger double endCall
    if (call.status === 'ended') {
      return call;
    }

    const participant = await this.databaseService.findCallParticipant(callId, userId);
    if (!participant) throw new ForbiddenException('Not in this call');

    // Only update if not already left
    if (participant.status === 'joined') {
      await this.databaseService.updateCallParticipant(participant.id, {
        status: 'left',
        leftAt: new Date(),
      });
    }

    // Check if any participants are still in the call
    const activeParticipants = await this.databaseService.getActiveCallParticipants(callId);
    if (activeParticipants.length === 0) {
      return this.endCall(callId, userId);
    }

    return (await this.databaseService.findCallById(callId))!;
  }

  async addParticipant(callId: string, userId: string, targetUserId: string): Promise<CallParticipant> {
    const call = await this.databaseService.findCallById(callId);
    if (!call) throw new NotFoundException('Call not found');
    if (call.status !== 'active') throw new BadRequestException('Call is not active');

    const existing = await this.databaseService.findCallParticipant(callId, targetUserId);
    if (existing && existing.status === 'joined') {
      throw new BadRequestException('User is already in this call');
    }

    const activeParticipants = await this.databaseService.getActiveCallParticipants(callId);
    if (activeParticipants.length >= call.maxParticipants) {
      throw new BadRequestException('Call is full');
    }

    return this.databaseService.createCallParticipant({
      callId,
      userId: targetUserId,
      status: 'invited',
      joinedAt: null,
      leftAt: null,
      isMuted: false,
      isVideoEnabled: call.callType === 'video',
    });
  }

  async toggleMute(callId: string, userId: string): Promise<CallParticipant> {
    const participant = await this.databaseService.findCallParticipant(callId, userId);
    if (!participant) throw new NotFoundException('Not in this call');

    const updated = await this.databaseService.updateCallParticipant(participant.id, {
      isMuted: !participant.isMuted,
    });
    return updated!;
  }

  async toggleVideo(callId: string, userId: string): Promise<CallParticipant> {
    const participant = await this.databaseService.findCallParticipant(callId, userId);
    if (!participant) throw new NotFoundException('Not in this call');

    const updated = await this.databaseService.updateCallParticipant(participant.id, {
      isVideoEnabled: !participant.isVideoEnabled,
    });
    return updated!;
  }

  // L7: Added offset parameter for pagination support
  async getCallHistory(userId: string, limit = 50, offset = 0): Promise<Array<Call & { participants: CallParticipant[] }>> {
    const calls = await this.databaseService.getCallHistory(userId, limit, offset);
    const results: Array<Call & { participants: CallParticipant[] }> = [];
    
    for (const call of calls) {
      const participants = await this.databaseService.findCallParticipantsByCallId(call.id);
      results.push({ ...call, participants });
    }

    return results;
  }

  async getCallById(callId: string): Promise<Call & { participants: CallParticipant[] }> {
    const call = await this.databaseService.findCallById(callId);
    if (!call) throw new NotFoundException('Call not found');

    const participants = await this.databaseService.findCallParticipantsByCallId(callId);
    return { ...call, participants };
  }

  formatCallDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // H10: Get stale ringing calls that have exceeded the timeout
  async getStaleRingingCalls(timeoutMs: number): Promise<Call[]> {
    return this.databaseService.getStaleRingingCalls(timeoutMs);
  }

  private formatCallMessage(call: Call, duration: number): string {
    const type = call.callType === 'video' ? 'Video call' : 'Voice call';
    if (duration > 0) {
      return `${type} - Duration: ${this.formatCallDuration(duration)}`;
    }
    if (call.status === 'declined') {
      return `${type} - Declined`;
    }
    return `${type} - Missed`;
  }

  async createCallMessage(
    callId: string,
    chatId: string,
    senderId: string,
    callMessage: string,
  ) {
    return await this.databaseService.createMessage({
      chatId,
      senderId,
      senderDeviceId: null,
      content: callMessage,
      ciphertext: null,
      type: 'call',
      status: 'sent',
      mediaUrl: null,
      mediaType: null,
      mediaName: null,
      mediaSize: null,
      mediaDuration: null,
      deliveredAt: null,
      readAt: null,
      isStarred: false,
      forwardedFrom: null,
      replyToMessageId: null,
      reactions: null,
      isEdited: false,
      isDeleted: false,
      editedAt: null,
      expiresAt: null,
      isViewOnce: false,
      isViewed: false,
    });
  }
}
