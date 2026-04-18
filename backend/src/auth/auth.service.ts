import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma-service/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
  ) {}

  async sendOtp(phone: string): Promise<{ message: string }> {
    const otp = this.generateOtp();
    await this.redis.setOtp(phone, otp, 300); // 5 min TTL

    const provider = process.env.OTP_PROVIDER || 'mock';
    if (provider === 'twilio') {
      await this.sendTwilioSms(phone, otp);
    } else {
      console.log(`[Mock OTP] ${phone}: ${otp}`);
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(phone: string, otp: string): Promise<{
    token: string;
    refreshToken: string;
    user: { id: string; phone: string; displayName: string | null; isNewUser: boolean };
  }> {
    const storedOtp = await this.redis.getOtp(phone);
    const devOtp = process.env.DEV_OTP;

    if (!storedOtp && otp !== devOtp) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    if (storedOtp !== otp && otp !== devOtp) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.redis.deleteOtp(phone);

    let user = await this.prisma.user.findUnique({ where: { phone } });
    const isNewUser = !user;

    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, displayName: phone },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastSeen: new Date() },
    });

    const payload = { sub: user.id, phone: user.phone };
    const token = this.jwt.sign(payload, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });
    const refreshToken = this.jwt.sign(payload, { expiresIn: '90d' });

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        isNewUser,
      },
    };
  }

  async register(phone: string, otp: string, displayName: string, profilePhoto?: string) {
    const storedOtp = await this.redis.getOtp(phone);
    const devOtp = process.env.DEV_OTP;

    if (!storedOtp && otp !== devOtp) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    if (storedOtp !== otp && otp !== devOtp) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.redis.deleteOtp(phone);

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      // Update existing user's profile
      const user = await this.prisma.user.update({
        where: { phone },
        data: { displayName, profilePhoto, isOnline: true, lastSeen: new Date() },
      });
      const payload = { sub: user.id, phone: user.phone };
      const token = this.jwt.sign(payload, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });
      const refreshToken = this.jwt.sign(payload, { expiresIn: '90d' });
      return { token, refreshToken, user };
    }

    const user = await this.prisma.user.create({
      data: { phone, displayName, profilePhoto, isOnline: true },
    });

    const payload = { sub: user.id, phone: user.phone };
    const token = this.jwt.sign(payload, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });
    const refreshToken = this.jwt.sign(payload, { expiresIn: '90d' });

    return { token, refreshToken, user };
  }

  async refreshToken(refreshTokenStr: string) {
    try {
      const payload = this.jwt.verify(refreshTokenStr);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException('User not found');

      const newPayload = { sub: user.id, phone: user.phone };
      const token = this.jwt.sign(newPayload, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });
      const newRefreshToken = this.jwt.sign(newPayload, { expiresIn: '90d' });

      return { token, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendTwilioSms(phone: string, otp: string): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.log(`[Twilio not configured] OTP for ${phone}: ${otp}`);
      return;
    }

    try {
      const twilio = require('twilio');
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        body: `Your Abhi Chat verification code is: ${otp}`,
        from: fromNumber,
        to: phone,
      });
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Twilio SMS error:', error.message);
      // Fall back to mock if Twilio fails
      console.log(`[Twilio fallback] OTP for ${phone}: ${otp}`);
    }
  }
}
