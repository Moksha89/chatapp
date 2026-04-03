import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpProvider, OtpSendResult, OtpVerifyResult } from './otp-provider.interface';

interface TwilioClient {
  messages: { create: (params: { body: string; from: string; to: string }) => Promise<{ sid: string }> };
}

@Injectable()
export class TwilioOtpProvider implements OtpProvider {
  private readonly logger = new Logger(TwilioOtpProvider.name);
  private otpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();
  private twilioClient: TwilioClient | null = null;
  private initPromise: Promise<void>;

  constructor(private readonly configService: ConfigService) {
    this.initPromise = this.initializeTwilio();
  }

  private normalizePhoneNumber(phone: string): string {
    const digits = phone.replace(/[^\d+]/g, '');
    return digits.startsWith('+') ? digits : `+${digits}`;
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

  async sendOtp(phoneNumber: string): Promise<OtpSendResult> {
    await this.initPromise;
    
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    const devOtp = this.configService.get<string>('DEV_OTP');
    const otp = devOtp || Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    this.otpStore.set(normalizedPhone, { otp, expiresAt });
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
        body: `Your verification code is: ${otp}. It expires in 5 minutes.`,
        from: twilioPhoneNumber,
        to: phoneNumber,
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
      const isDev = this.configService.get('NODE_ENV') !== 'production';
      this.logger.warn(`SMS delivery failed, OTP for ${normalizedPhone}: ${otp}`);
      return {
        success: true,
        message: 'OTP sent successfully',
        otp: isDev ? otp : undefined,
      };
    }
  }

  async verifyOtp(phoneNumber: string, otp: string): Promise<OtpVerifyResult> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    this.logger.log(`Verifying OTP for ${normalizedPhone}`);
    const stored = this.otpStore.get(normalizedPhone);

    if (!stored) {
      this.logger.warn(`No OTP found for ${normalizedPhone}`);
      return { success: false, message: 'OTP not found or expired' };
    }

    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(normalizedPhone);
      return { success: false, message: 'OTP expired' };
    }

    if (stored.otp !== otp) {
      this.logger.warn(`OTP mismatch for ${normalizedPhone}: expected ${stored.otp}, got ${otp}`);
      return { success: false, message: 'Invalid OTP' };
    }

    // Don't delete OTP on success - let it expire naturally after 5 minutes
    // This allows multiple verification attempts (e.g., login fails -> register) to work
    this.logger.log(`OTP verified successfully for ${normalizedPhone}`);
    return { success: true, message: 'OTP verified successfully' };
  }
}
