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

  // Online presence
  async setOnline(userId: string, socketId: string): Promise<void> {
    await this.client.hset('online_users', userId, socketId);
  }

  async setOffline(userId: string): Promise<void> {
    await this.client.hdel('online_users', userId);
  }

  async isOnline(userId: string): Promise<boolean> {
    return !!(await this.client.hget('online_users', userId));
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
