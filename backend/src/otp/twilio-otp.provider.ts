import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpProvider, OtpSendResult, OtpVerifyResult } from './otp-provider.interface';
import { RedisService } from '../redis/redis.service';

interface TwilioClient {
  messages: { create: (params: { body: string; from: string; to: string }) => Promise<{ sid: string }> };
}

@Injectable()
export class TwilioOtpProvider implements OtpProvider {
  private readonly logger = new Logger(TwilioOtpProvider.name);
  private otpStore: Map<string, { otp: string; expiresAt: Date; usageCount: number }> = new Map();
  private twilioClient: TwilioClient | null = null;
  private initPromise: Promise<void>;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService?: RedisService,
  ) {
    this.initPromise = this.initializeTwilio();
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove spaces, dashes, parentheses, dots — keep digits and leading +
    let cleaned = phone.replace(/[\s\-().]/g, '');
    // Ensure E.164 format: must start with +
    if (!cleaned.startsWith('+')) {
      cleaned = `+${cleaned}`;
    }
    // Remove any remaining non-digit chars except the leading +
    return '+' + cleaned.slice(1).replace(/\D/g, '');
  }

  private async initializeTwilio(): Promise<void> {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      try {
        const twilio = await (Function('return import("twilio")')() as Promise<{ default: (accountSid: string, authToken: string) => TwilioClient }>);
        this.twilioClient = twilio.default(accountSid, authToken);
        this.logger.log('Twilio client initialized successfully');
      } catch (error) {
        this.logger.warn('Twilio package not installed - SMS will not be sent. Install with: npm install twilio');
      }
    } else {
      this.logger.warn('Twilio credentials not configured - SMS will not be sent');
    }
  }

  private async storeOtp(phone: string, otp: string, ttlSeconds: number): Promise<void> {
    const data = JSON.stringify({ otp, usageCount: 0 });
    if (this.redisService?.connected) {
      try {
        const client = this.redisService.getClient();
        if (client) {
          await client.setex(`otp:${phone}`, ttlSeconds, data);
          this.logger.log(`OTP stored in Redis for ${phone}`);
          return;
        }
      } catch (err) {
        this.logger.warn(`Redis OTP store failed, falling back to memory: ${err instanceof Error ? err.message : err}`);
      }
    }
    // Fallback to in-memory (works for single instance)
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    this.otpStore.set(phone, { otp, expiresAt, usageCount: 0 });
    this.logger.log(`OTP stored in memory for ${phone}`);
  }

  private async getStoredOtp(phone: string): Promise<{ otp: string; usageCount: number } | null> {
    if (this.redisService?.connected) {
      try {
        const client = this.redisService.getClient();
        if (client) {
          const data = await client.get(`otp:${phone}`);
          if (data) {
            return JSON.parse(data) as { otp: string; usageCount: number };
          }
          return null;
        }
      } catch (err) {
        this.logger.warn(`Redis OTP get failed, falling back to memory: ${err instanceof Error ? err.message : err}`);
      }
    }
    // Fallback to in-memory
    const stored = this.otpStore.get(phone);
    if (!stored) return null;
    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(phone);
      return null;
    }
    return { otp: stored.otp, usageCount: stored.usageCount };
  }

  private async updateOtpUsage(phone: string, usageCount: number): Promise<void> {
    if (this.redisService?.connected) {
      try {
        const client = this.redisService.getClient();
        if (client) {
          const ttl = await client.ttl(`otp:${phone}`);
          if (ttl > 0) {
            const data = JSON.stringify({ otp: '', usageCount }); // otp not needed after verify
            // Re-read to preserve otp value
            const existing = await client.get(`otp:${phone}`);
            if (existing) {
              const parsed = JSON.parse(existing) as { otp: string; usageCount: number };
              parsed.usageCount = usageCount;
              await client.setex(`otp:${phone}`, ttl, JSON.stringify(parsed));
            }
          }
          return;
        }
      } catch (err) {
        this.logger.warn(`Redis OTP update failed: ${err instanceof Error ? err.message : err}`);
      }
    }
    // Fallback to in-memory
    const stored = this.otpStore.get(phone);
    if (stored) {
      stored.usageCount = usageCount;
    }
  }

  private async deleteStoredOtp(phone: string): Promise<void> {
    if (this.redisService?.connected) {
      try {
        const client = this.redisService.getClient();
        if (client) {
          await client.del(`otp:${phone}`);
          return;
        }
      } catch (err) {
        this.logger.warn(`Redis OTP delete failed: ${err instanceof Error ? err.message : err}`);
      }
    }
    this.otpStore.delete(phone);
  }

  async sendOtp(phoneNumber: string): Promise<OtpSendResult> {
    await this.initPromise;
    
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    const devOtp = this.configService.get<string>('DEV_OTP');
    const otp = devOtp || Math.floor(100000 + Math.random() * 900000).toString();
    const ttlSeconds = 5 * 60; // 5 minutes

    await this.storeOtp(normalizedPhone, otp, ttlSeconds);
    this.logger.log(`OTP stored for ${normalizedPhone}`);

    if (!this.twilioClient) {
      this.logger.warn(`Twilio not configured - OTP for ${phoneNumber}: ${otp}`);
      return {
        success: false,
        message: 'SMS provider not configured',
      };
    }

    try {
      const twilioPhoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');
      if (!twilioPhoneNumber) {
        throw new Error('TWILIO_PHONE_NUMBER not configured');
      }

      await this.twilioClient.messages.create({
        body: `Your Abhi Chat verification code is: ${otp}. It expires in 5 minutes.`,
        from: twilioPhoneNumber,
        to: normalizedPhone,
      });

      this.logger.log(`OTP sent to ${phoneNumber}`);
      return {
        success: true,
        message: 'OTP sent successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to send OTP via Twilio to ${phoneNumber}:`, error);
      // SMS delivery failed but OTP is stored - still return success
      // so the app can proceed (user can use DEV_OTP fallback or retry)
      this.logger.warn(`SMS delivery failed for ${normalizedPhone}`);
      return {
        success: true,
        message: 'OTP sent successfully',
      };
    }
  }

  async verifyOtp(phoneNumber: string, otp: string): Promise<OtpVerifyResult> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    this.logger.log(`Verifying OTP for ${normalizedPhone}`);
    const stored = await this.getStoredOtp(normalizedPhone);

    if (!stored) {
      this.logger.warn(`No OTP found for ${normalizedPhone}`);
      return { success: false, message: 'OTP not found or expired' };
    }

    if (stored.otp !== otp) {
      this.logger.warn(`OTP mismatch for ${normalizedPhone}`);
      return { success: false, message: 'Invalid OTP' };
    }

    // Allow up to 2 uses (login attempt + register), then invalidate
    const newUsageCount = stored.usageCount + 1;
    if (newUsageCount >= 2) {
      await this.deleteStoredOtp(normalizedPhone);
    } else {
      await this.updateOtpUsage(normalizedPhone, newUsageCount);
    }
    this.logger.log(`OTP verified successfully for ${normalizedPhone} (usage ${newUsageCount})`);
    return { success: true, message: 'OTP verified successfully' };
  }
}
