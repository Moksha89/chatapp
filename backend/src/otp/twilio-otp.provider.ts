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
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    this.otpStore.set(phoneNumber, { otp, expiresAt });

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
      this.logger.error(`Failed to send OTP to ${phoneNumber}:`, error);
      return {
        success: false,
        message: 'Failed to send OTP',
      };
    }
  }

  async verifyOtp(phoneNumber: string, otp: string): Promise<OtpVerifyResult> {
    const stored = this.otpStore.get(phoneNumber);

    if (!stored) {
      return { success: false, message: 'OTP not found or expired' };
    }

    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(phoneNumber);
      return { success: false, message: 'OTP expired' };
    }

    if (stored.otp !== otp) {
      return { success: false, message: 'Invalid OTP' };
    }

    this.otpStore.delete(phoneNumber);
    return { success: true, message: 'OTP verified successfully' };
  }
}
