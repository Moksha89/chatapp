import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export function RateLimit(options: RateLimitOptions) {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(RATE_LIMIT_KEY, options, descriptor.value);
    return descriptor;
  };
}

/**
 * Global default rate limits applied when no @RateLimit decorator is present.
 * Generous defaults to prevent abuse without affecting normal usage.
 */
const GLOBAL_DEFAULTS: RateLimitOptions = {
  windowMs: 60000,   // 1 minute window
  maxRequests: 100,   // 100 requests per minute per IP+path
};

@Injectable()
export class RateLimitGuard implements CanActivate, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitGuard.name);
  private redisClient: import('ioredis').default | null = null;
  private fallbackStore: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        const { default: Redis } = await import('ioredis');
        this.redisClient = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => Math.min(times * 200, 2000),
          enableReadyCheck: true,
          lazyConnect: true,
        });
        await this.redisClient.connect();
        this.logger.log('Redis-backed rate limiting enabled');
      } catch (err) {
        this.logger.warn(`Redis not available for rate limiting, using in-memory fallback: ${err instanceof Error ? err.message : err}`);
        this.redisClient = null;
        this.startFallbackCleanup();
      }
    } else {
      this.logger.log('No REDIS_URL configured, using in-memory rate limiting');
      this.startFallbackCleanup();
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get per-endpoint options from @RateLimit decorator, or use global defaults
    const options = this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, context.getHandler()) || GLOBAL_DEFAULTS;

    const request = context.switchToHttp().getRequest<Request>();
    const key = this.getKey(request);

    if (this.redisClient) {
      return this.checkRedis(key, options);
    }
    return this.checkInMemory(key, options);
  }

  /**
   * Redis-backed rate limiting using INCR + EXPIRE (atomic, distributed)
   */
  private async checkRedis(key: string, options: RateLimitOptions): Promise<boolean> {
    try {
      const redisKey = `ratelimit:${key}`;
      const windowSec = Math.ceil(options.windowMs / 1000);

      const count = await this.redisClient!.incr(redisKey);
      if (count === 1) {
        await this.redisClient!.expire(redisKey, windowSec);
      }

      if (count > options.maxRequests) {
        const ttl = await this.redisClient!.ttl(redisKey);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests, please try again later',
            retryAfter: ttl > 0 ? ttl : windowSec,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.warn(`Redis rate limit error, falling back to in-memory: ${err instanceof Error ? err.message : err}`);
      return this.checkInMemory(key, options);
    }
  }

  /**
   * In-memory fallback rate limiting (single-instance only)
   */
  private checkInMemory(key: string, options: RateLimitOptions): boolean {
    const now = Date.now();
    const entry = this.fallbackStore.get(key);

    if (!entry || now > entry.resetTime) {
      this.fallbackStore.set(key, { count: 1, resetTime: now + options.windowMs });
      return true;
    }

    if (entry.count >= options.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count++;
    return true;
  }

  private getKey(request: Request): string {
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const path = request.path;
    return `${ip}:${path}`;
  }

  private startFallbackCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.fallbackStore.entries()) {
        if (now > entry.resetTime) {
          this.fallbackStore.delete(key);
        }
      }
    }, 60000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}
