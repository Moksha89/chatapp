import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: import('ioredis').default | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.log('No REDIS_URL configured — Redis features disabled');
      return;
    }

    try {
      const { default: Redis } = await import('ioredis');
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 200, 2000),
        enableReadyCheck: true,
        lazyConnect: true,
      });
      await this.client.connect();
      this.isConnected = true;
      this.logger.log('Redis connected for session/presence management');
    } catch (err) {
      this.logger.warn(`Redis connection failed: ${err instanceof Error ? err.message : err}`);
      this.client = null;
      this.isConnected = false;
    }
  }

  get connected(): boolean {
    return this.isConnected && this.client !== null;
  }

  getClient(): import('ioredis').default | null {
    return this.client;
  }

  // ── Session Management ──

  async setSession(userId: string, sessionData: Record<string, unknown>, ttlSeconds = 86400): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setex(`session:${userId}`, ttlSeconds, JSON.stringify(sessionData));
    } catch (err) {
      this.logger.warn(`Redis setSession error: ${err instanceof Error ? err.message : err}`);
    }
  }

  async getSession(userId: string): Promise<Record<string, unknown> | null> {
    if (!this.client) return null;
    try {
      const data = await this.client.get(`session:${userId}`);
      return data ? JSON.parse(data) as Record<string, unknown> : null;
    } catch (err) {
      this.logger.warn(`Redis getSession error: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }

  async deleteSession(userId: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(`session:${userId}`);
    } catch (err) {
      this.logger.warn(`Redis deleteSession error: ${err instanceof Error ? err.message : err}`);
    }
  }

  // ── Presence Management ──

  async setUserOnline(userId: string, socketId: string, deviceId?: string): Promise<void> {
    if (!this.client) return;
    try {
      const key = `presence:${userId}`;
      const data = JSON.stringify({
        status: 'online',
        socketId,
        deviceId: deviceId || null,
        lastSeen: new Date().toISOString(),
      });
      await this.client.hset(key, socketId, data);
      await this.client.expire(key, 300); // 5 min TTL, refreshed by heartbeat
    } catch (err) {
      this.logger.warn(`Redis setUserOnline error: ${err instanceof Error ? err.message : err}`);
    }
  }

  async setUserOffline(userId: string, socketId: string): Promise<void> {
    if (!this.client) return;
    try {
      const key = `presence:${userId}`;
      await this.client.hdel(key, socketId);
      const remaining = await this.client.hlen(key);
      if (remaining === 0) {
        // Store last-seen timestamp when fully offline
        await this.client.setex(`lastseen:${userId}`, 86400 * 7, new Date().toISOString());
        await this.client.del(key);
      }
    } catch (err) {
      this.logger.warn(`Redis setUserOffline error: ${err instanceof Error ? err.message : err}`);
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const count = await this.client.hlen(`presence:${userId}`);
      return count > 0;
    } catch {
      return false;
    }
  }

  async getOnlineUsers(): Promise<string[]> {
    if (!this.client) return [];
    try {
      const keys = await this.client.keys('presence:*');
      return keys.map(k => k.replace('presence:', ''));
    } catch {
      return [];
    }
  }

  async refreshPresence(userId: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.expire(`presence:${userId}`, 300);
    } catch (err) {
      this.logger.warn(`Redis refreshPresence error: ${err instanceof Error ? err.message : err}`);
    }
  }

  async getLastSeen(userId: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(`lastseen:${userId}`);
    } catch {
      return null;
    }
  }

  // ── Typing Indicators ──

  async setTyping(chatId: string, userId: string, isTyping: boolean): Promise<void> {
    if (!this.client) return;
    try {
      const key = `typing:${chatId}`;
      if (isTyping) {
        await this.client.hset(key, userId, Date.now().toString());
        await this.client.expire(key, 30); // Typing auto-expires in 30s
      } else {
        await this.client.hdel(key, userId);
      }
    } catch (err) {
      this.logger.warn(`Redis setTyping error: ${err instanceof Error ? err.message : err}`);
    }
  }

  async getTypingUsers(chatId: string): Promise<string[]> {
    if (!this.client) return [];
    try {
      const users = await this.client.hkeys(`typing:${chatId}`);
      return users;
    } catch {
      return [];
    }
  }

  // ── Generic Cache ──

  async cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setex(`cache:${key}`, ttlSeconds, value);
    } catch (err) {
      this.logger.warn(`Redis cacheSet error: ${err instanceof Error ? err.message : err}`);
    }
  }

  async cacheGet(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(`cache:${key}`);
    } catch {
      return null;
    }
  }

  async cacheDel(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(`cache:${key}`);
    } catch (err) {
      this.logger.warn(`Redis cacheDel error: ${err instanceof Error ? err.message : err}`);
    }
  }

  // ── Health Check ──

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      this.logger.log('Redis connection closed');
    }
  }
}
