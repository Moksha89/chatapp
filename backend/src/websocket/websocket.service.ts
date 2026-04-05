import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';

interface ConnectedUser {
  userId: string;
  sockets: Set<string>;
  deviceIds: Map<string, string>;
  lastHeartbeat: number;
}

@Injectable()
export class WebsocketService {
  private readonly logger = new Logger(WebsocketService.name);
  private server: Server | null = null;
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private socketToUser: Map<string, string> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map();
  private pendingMessages: Map<string, Array<{ event: string; data: unknown }>> = new Map();
  private readonly HEARTBEAT_TIMEOUT = 60000; // 60 seconds

  constructor(@Optional() @Inject(RedisService) private readonly redisService?: RedisService) {}

  setServer(server: Server) {
    this.server = server;
  }

  addConnection(userId: string, socketId: string, deviceId?: string) {
    let user = this.connectedUsers.get(userId);
    if (!user) {
      user = { userId, sockets: new Set(), deviceIds: new Map(), lastHeartbeat: Date.now() };
      this.connectedUsers.set(userId, user);
    }
    user.sockets.add(socketId);
    user.lastHeartbeat = Date.now();
    if (deviceId) {
      user.deviceIds.set(socketId, deviceId);
    }
    this.socketToUser.set(socketId, userId);

    // Track presence in Redis for distributed scaling
    if (this.redisService?.connected) {
      this.redisService.setUserOnline(userId, socketId, deviceId).catch(() => {});
      this.redisService.setSession(userId, {
        connectedAt: new Date().toISOString(),
        socketId,
        deviceId: deviceId || null,
      }).catch(() => {});
    }

    // Deliver pending messages
    const pending = this.pendingMessages.get(userId);
    if (pending && pending.length > 0 && this.server) {
      for (const msg of pending) {
        this.server.to(socketId).emit(msg.event, msg.data);
      }
      this.pendingMessages.delete(userId);
    }
  }

  removeConnection(socketId: string) {
    const userId = this.socketToUser.get(socketId);
    if (userId) {
      const user = this.connectedUsers.get(userId);
      if (user) {
        user.sockets.delete(socketId);
        user.deviceIds.delete(socketId);
        if (user.sockets.size === 0) {
          this.connectedUsers.delete(userId);
        }
      }
      this.socketToUser.delete(socketId);

      // Update Redis presence
      if (this.redisService?.connected) {
        this.redisService.setUserOffline(userId, socketId).catch(() => {});
        if (!this.isUserOnline(userId)) {
          this.redisService.deleteSession(userId).catch(() => {});
        }
      }
    }
  }

  getUserIdBySocketId(socketId: string): string | undefined {
    return this.socketToUser.get(socketId);
  }

  isUserOnline(userId: string): boolean {
    const user = this.connectedUsers.get(userId);
    return user !== undefined && user.sockets.size > 0;
  }

  getUserSockets(userId: string): string[] {
    const user = this.connectedUsers.get(userId);
    return user ? Array.from(user.sockets) : [];
  }

  emitToUser(userId: string, event: string, data: unknown) {
    const sockets = this.getUserSockets(userId);
    if (this.server) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }

  emitToUsers(userIds: string[], event: string, data: unknown) {
    for (const userId of userIds) {
      this.emitToUser(userId, event, data);
    }
  }

  setTyping(chatId: string, userId: string, isTyping: boolean) {
    let chatTyping = this.typingUsers.get(chatId);
    if (!chatTyping) {
      chatTyping = new Set();
      this.typingUsers.set(chatId, chatTyping);
    }

    if (isTyping) {
      chatTyping.add(userId);
    } else {
      chatTyping.delete(userId);
    }
  }

  getTypingUsers(chatId: string): string[] {
    const chatTyping = this.typingUsers.get(chatId);
    return chatTyping ? Array.from(chatTyping) : [];
  }

  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  disconnectDevice(userId: string, deviceId: string): void {
    const user = this.connectedUsers.get(userId);
    if (!user || !this.server) return;

    // Find sockets associated with this deviceId
    const socketsToDisconnect: string[] = [];
    user.deviceIds.forEach((dId, socketId) => {
      if (dId === deviceId) {
        socketsToDisconnect.push(socketId);
      }
    });

    // Emit force_logout event and disconnect each socket
    for (const socketId of socketsToDisconnect) {
      this.server.to(socketId).emit('force_logout', { 
        reason: 'device_removed',
        deviceId 
      });
      
      // Get the socket and disconnect it
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
      
      // Clean up our tracking
      this.removeConnection(socketId);
    }
    
    console.log(`Disconnected ${socketsToDisconnect.length} sockets for device ${deviceId}`);
  }

  emitToDevice(userId: string, deviceId: string, event: string, data: unknown): void {
    const user = this.connectedUsers.get(userId);
    if (!user || !this.server) return;

    user.deviceIds.forEach((dId, socketId) => {
      if (dId === deviceId) {
        this.server!.to(socketId).emit(event, data);
      }
    });
  }

  // Heartbeat: update timestamp for a user
  updateHeartbeat(userId: string): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      user.lastHeartbeat = Date.now();
    }
  }

  // Check for stale connections (no heartbeat within timeout)
  getStaleUsers(): string[] {
    const now = Date.now();
    const stale: string[] = [];
    this.connectedUsers.forEach((user, userId) => {
      if (now - user.lastHeartbeat > this.HEARTBEAT_TIMEOUT) {
        stale.push(userId);
      }
    });
    return stale;
  }

  // Remove all sockets for a stale user
  removeAllConnectionsForUser(userId: string): void {
    const user = this.connectedUsers.get(userId);
    if (!user) return;

    for (const socketId of user.sockets) {
      this.socketToUser.delete(socketId);
      if (this.server?.sockets?.sockets) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      }
    }
    this.connectedUsers.delete(userId);
  }

  // Queue a message for offline user delivery
  queueMessageForUser(userId: string, event: string, data: unknown): void {
    if (!this.pendingMessages.has(userId)) {
      this.pendingMessages.set(userId, []);
    }
    const queue = this.pendingMessages.get(userId)!;
    // Limit queue size to prevent memory issues
    if (queue.length < 500) {
      queue.push({ event, data });
    }
  }

  // Emit to user, or queue if offline
  emitToUserOrQueue(userId: string, event: string, data: unknown): void {
    if (this.isUserOnline(userId)) {
      this.emitToUser(userId, event, data);
    } else {
      this.queueMessageForUser(userId, event, data);
    }
  }

  getConnectedUserCount(): number {
    return this.connectedUsers.size;
  }
}
