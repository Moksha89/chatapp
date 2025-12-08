import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface ConnectedUser {
  userId: string;
  sockets: Set<string>;
  deviceIds: Map<string, string>;
}

@Injectable()
export class WebsocketService {
  private server: Server | null = null;
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private socketToUser: Map<string, string> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map();

  setServer(server: Server) {
    this.server = server;
  }

  addConnection(userId: string, socketId: string, deviceId?: string) {
    let user = this.connectedUsers.get(userId);
    if (!user) {
      user = { userId, sockets: new Set(), deviceIds: new Map() };
      this.connectedUsers.set(userId, user);
    }
    user.sockets.add(socketId);
    if (deviceId) {
      user.deviceIds.set(socketId, deviceId);
    }
    this.socketToUser.set(socketId, userId);
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
}
