import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private offlineQueue: Array<{ event: string; data: unknown }> = [];

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      this.notifyListeners('_connection', { connected: true });
      this.startHeartbeat();
      // Flush offline queue on reconnect
      this.flushOfflineQueue();
    });

    this.socket.on('disconnect', () => {
      this.notifyListeners('_connection', { connected: false });
      this.stopHeartbeat();
    });

    this.socket.on('error', () => {
      // Socket errors handled via listeners
    });

    this.socket.onAny((event, data) => {
      this.notifyListeners(event, data);
    });
  }

    // Bug #16 fix: Clear listeners Map on disconnect to prevent memory leaks
    disconnect() {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      this.listeners.clear();
    }

    isConnected(): boolean {
      return this.socket?.connected ?? false;
    }

  on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  off(event: string, callback: (data: unknown) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  private notifyListeners(event: string, data: unknown) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => listener(data));
    }
  }

  emit(event: string, data: unknown, callback?: (response: unknown) => void) {
    if (this.socket?.connected) {
      if (callback) {
        this.socket.emit(event, data, callback);
      } else {
        this.socket.emit(event, data);
      }
    } else if (event.startsWith('message:send')) {
      // Queue messages when offline for later delivery
      this.offlineQueue.push({ event, data });
    }
  }

  private flushOfflineQueue() {
    while (this.offlineQueue.length > 0) {
      const item = this.offlineQueue.shift();
      if (item && this.socket?.connected) {
        this.socket.emit(item.event, item.data);
      }
    }
  }

  sendMessage(chatId: string, content: string, tempId: string) {
    this.emit('message:send', { chatId, content, tempId });
  }

  markDelivered(messageId: string) {
    this.emit('message:delivered', { messageId });
  }

  markRead(chatId: string, messageIds: string[]) {
    this.emit('message:read', { chatId, messageIds });
  }

  startTyping(chatId: string) {
    this.emit('typing:start', { chatId });
  }

  stopTyping(chatId: string) {
    this.emit('typing:stop', { chatId });
  }

  // Feature #12: Send presence online/offline
  setOnline() {
    this.emit('presence:online', {});
  }

  setOffline() {
    this.emit('presence:offline', {});
  }

  // ChitChat: Heartbeat-based presence (30s interval, 60s timeout on server)
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.emit('heartbeat', { timestamp: Date.now() });
    }, 30000);
    // Send initial heartbeat
    this.emit('heartbeat', { timestamp: Date.now() });
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ChitChat: Call signaling
  initiateCall(data: { receiverId: string; chatId: string; callType: 'audio' | 'video'; offer?: unknown }) {
    this.emit('call:initiate', data);
  }

  answerCall(data: { callerId: string; chatId: string; answer?: unknown }) {
    this.emit('call:answer', data);
  }

  declineCall(data: { callerId: string; chatId: string }) {
    this.emit('call:decline', data);
  }

  endCall(data: { peerId: string; chatId: string }) {
    this.emit('call:end', data);
  }

  sendIceCandidate(data: { peerId: string; candidate: unknown }) {
    this.emit('call:ice-candidate', data);
  }

  toggleCallMute(data: { callId: string; isMuted: boolean }) {
    this.emit('call:mute', data);
  }

  toggleCallVideo(data: { callId: string; isVideoOff: boolean }) {
    this.emit('call:video-toggle', data);
  }
}

export const socketService = new SocketService();
