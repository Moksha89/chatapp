import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  onModuleInit() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.client.on('connect', () => console.log('Redis connected'));
    this.client.on('error', (err) => console.error('Redis error:', err.message));
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  getClient(): Redis { return this.client; }

  // Online presence — BUG 4 FIX: Use sets to track multiple sockets per user
  async addSocket(userId: string, socketId: string): Promise<void> {
    await this.client.sadd(`user_sockets:${userId}`, socketId);
    await this.client.hset('online_users', userId, socketId); // Keep for backward compat
  }

  async removeSocket(userId: string, socketId: string): Promise<void> {
    await this.client.srem(`user_sockets:${userId}`, socketId);
    const remaining = await this.client.scard(`user_sockets:${userId}`);
    if (remaining === 0) {
      await this.client.hdel('online_users', userId);
      await this.client.del(`user_sockets:${userId}`);
    }
  }

  async getSocketCount(userId: string): Promise<number> {
    return this.client.scard(`user_sockets:${userId}`);
  }

  // Legacy methods kept for backward compatibility
  async setOnline(userId: string, socketId: string): Promise<void> {
    await this.addSocket(userId, socketId);
  }

  async setOffline(userId: string): Promise<void> {
    await this.client.hdel('online_users', userId);
    await this.client.del(`user_sockets:${userId}`);
  }

  async isOnline(userId: string): Promise<boolean> {
    const count = await this.client.scard(`user_sockets:${userId}`);
    return count > 0;
  }

  async getSocketId(userId: string): Promise<string | null> {
    return this.client.hget('online_users', userId);
  }

  async getAllOnlineUsers(): Promise<Record<string, string>> {
    return this.client.hgetall('online_users');
  }

  // OTP storage
  async setOtp(phone: string, otp: string, ttl = 300): Promise<void> {
    await this.client.setex(`otp:${phone}`, ttl, otp);
  }

  async getOtp(phone: string): Promise<string | null> {
    return this.client.get(`otp:${phone}`);
  }

  async deleteOtp(phone: string): Promise<void> {
    await this.client.del(`otp:${phone}`);
  }

  // Typing indicator
  async setTyping(chatId: string, userId: string): Promise<void> {
    await this.client.setex(`typing:${chatId}:${userId}`, 5, '1');
  }

  async isTyping(chatId: string, userId: string): Promise<boolean> {
    return !!(await this.client.get(`typing:${chatId}:${userId}`));
  }
}
