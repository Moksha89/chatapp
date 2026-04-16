import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../entities/user.entity';
import { Device } from '../entities/device.entity';
import { QrSession } from '../entities/qr-session.entity';

@Injectable()
export class AuthService {
  // In production, use a real OTP service (Twilio, etc.)
  private otpStore = new Map<string, { otp: string; expiresAt: number }>();

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Device)
    private deviceRepo: Repository<Device>,
    @InjectRepository(QrSession)
    private qrSessionRepo: Repository<QrSession>,
    private jwtService: JwtService,
  ) {}

  async sendOtp(phone: string): Promise<{ message: string }> {
    // Generate 6-digit OTP (use 123456 for dev)
    const otp = process.env.NODE_ENV === 'production'
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : '123456';

    this.otpStore.set(phone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
    });

    // Only log OTP in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Auth] OTP for ${phone}: ${otp}`);
    }
    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(
    phone: string,
    otp: string,
    deviceId: string,
    fcmToken?: string,
    platform?: string,
    displayName?: string,
  ): Promise<{ accessToken: string; user: User; isNewUser: boolean }> {
    const stored = this.otpStore.get(phone);

    // Dev OTP bypass: disabled when DISABLE_DEV_OTP=true (production-ready)
    const devOtp = process.env.DEV_OTP || '123456';
    const isDevBypass = process.env.DISABLE_DEV_OTP !== 'true' && otp === devOtp;
    if (!isDevBypass) {
      if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }
    }

    this.otpStore.delete(phone);

    // Find or create user
    let user = await this.userRepo.findOne({ where: { phone } });
    let isNewUser = false;

    if (!user) {
      if (!displayName) {
        // New user without displayName — return isNewUser flag so frontend can prompt for name
        // Don't create the user yet; they'll call verifyOtp again with displayName
        return { accessToken: '', user: { phone } as User, isNewUser: true };
      }
      user = this.userRepo.create({
        phone,
        displayName,
      });
      user = await this.userRepo.save(user);
      isNewUser = false; // User is now created with name, treat as normal login
    } else if (displayName && user.displayName === phone) {
      // Existing user updating their display name (from name step)
      user.displayName = displayName;
      user = await this.userRepo.save(user);
    }

    // Register device
    let device = await this.deviceRepo.findOne({
      where: { userId: user.id, deviceId },
    });

    if (device) {
      device.fcmToken = fcmToken || device.fcmToken;
      device.platform = platform || device.platform;
      await this.deviceRepo.save(device);
    } else {
      device = this.deviceRepo.create({
        userId: user.id,
        deviceId,
        fcmToken: fcmToken || null,
        platform: platform || 'android',
      });
      await this.deviceRepo.save(device);
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      deviceId,
    });

    return { accessToken, user, isNewUser };
  }

  async validateToken(token: string): Promise<User | null> {
    try {
      const payload = this.jwtService.verify(token);
      return this.userRepo.findOne({ where: { id: payload.sub } });
    } catch {
      return null;
    }
  }

  // QR code auth for web login
  async generateQrToken(): Promise<{ token: string; expiresAt: Date }> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 min

    const session = this.qrSessionRepo.create({
      token,
      expiresAt,
    });
    await this.qrSessionRepo.save(session);

    return { token, expiresAt };
  }

  async scanQr(
    token: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const session = await this.qrSessionRepo.findOne({ where: { token } });

    if (!session || new Date() > session.expiresAt) {
      throw new UnauthorizedException('QR code expired');
    }

    if (session.isScanned) {
      throw new UnauthorizedException('QR code already used');
    }

    session.userId = userId;
    session.isScanned = true;
    await this.qrSessionRepo.save(session);

    return { success: true };
  }

  async checkQrStatus(
    token: string,
  ): Promise<{ status: string; accessToken?: string; user?: User }> {
    const session = await this.qrSessionRepo.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!session || new Date() > session.expiresAt) {
      return { status: 'expired' };
    }

    if (!session.isScanned || !session.userId) {
      return { status: 'pending' };
    }

    const user = await this.userRepo.findOne({ where: { id: session.userId } });
    if (!user) {
      return { status: 'error' };
    }

    // Register web device
    const webDeviceId = `web-${uuidv4()}`;
    const device = this.deviceRepo.create({
      userId: user.id,
      deviceId: webDeviceId,
      platform: 'web',
    });
    await this.deviceRepo.save(device);

    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      deviceId: webDeviceId,
    });

    // Clean up QR session
    await this.qrSessionRepo.delete(session.id);

    return { status: 'authenticated', accessToken, user };
  }
}
