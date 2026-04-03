import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpProvider, OtpSendResult, OtpVerifyResult } from './otp-provider.interface';

@Injectable()
export class MockOtpProvider implements OtpProvider {
  private otpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(phoneNumber: string): Promise<OtpSendResult> {
    const devOtp = this.configService.get<string>('DEV_OTP');
    const otp = devOtp || Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    this.otpStore.set(phoneNumber, { otp, expiresAt });

    console.log(`[MOCK SMS] OTP for ${phoneNumber}: ${otp}`);

    const isDev = this.configService.get('NODE_ENV') !== 'production';
    return {
      success: true,
      message: 'OTP sent successfully (mock)',
      otp: isDev ? otp : undefined,
    };
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

    // Don't delete OTP on verification - allow reuse until expiry
    // This supports flows where login is tried first, then register
    return { success: true, message: 'OTP verified successfully' };
  }
}
