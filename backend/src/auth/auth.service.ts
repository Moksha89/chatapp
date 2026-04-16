import { Injectable, Inject, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { DevicesService } from '../devices/devices.service';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { OTP_PROVIDER, OtpProvider } from '../otp/otp-provider.interface';

export interface JwtPayload {
  sub: string;
  phone: string;
  deviceId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface QrPairingSession {
  pairingCode: string;
  webDeviceId: string;
  webPublicKey?: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'scanned' | 'completed' | 'expired';
  userId?: string;
}

@Injectable()
export class AuthService {
  private qrPairingSessions: Map<string, QrPairingSession> = new Map();

  constructor(
    private readonly usersService: UsersService,
    private readonly devicesService: DevicesService,
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(OTP_PROVIDER) private readonly otpProvider: OtpProvider,
  ) {}

  async sendOtp(phoneNumber: string): Promise<{ message: string; otp?: string }> {
    const result = await this.otpProvider.sendOtp(phoneNumber);
    return {
      message: result.message,
      otp: result.otp,
    };
  }

  async verifyOtp(phoneNumber: string, otp: string): Promise<boolean> {
    const result = await this.otpProvider.verifyOtp(phoneNumber, otp);
    return result.success;
  }

  async register(registerDto: RegisterDto): Promise<AuthTokens & { user: { id: string; phoneNumber: string; displayName: string } }> {
    const isValidOtp = await this.verifyOtp(registerDto.phoneNumber, registerDto.otp);
    if (!isValidOtp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const existingUser = await this.usersService.findByPhone(registerDto.phoneNumber);
    if (existingUser) {
      throw new BadRequestException('User with this phone number already exists');
    }

    const passwordHash = await bcrypt.hash(registerDto.phoneNumber + 'default', 10);

    const user = await this.usersService.create({
      phoneNumber: registerDto.phoneNumber,
      displayName: registerDto.displayName,
      isBusiness: registerDto.isBusiness || false,
      passwordHash,
    });

    const device = await this.devicesService.create({
      userId: user.id,
      deviceId: registerDto.deviceId,
      deviceName: registerDto.deviceName || 'Primary Device',
      deviceType: registerDto.deviceType || 'android',
      isPrimary: true,
    });

    const tokens = await this.generateTokens(user.id, user.phoneNumber, device.id);

    return {
      ...tokens,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthTokens & { user: { id: string; phoneNumber: string; displayName: string } }> {
    const isValidOtp = await this.verifyOtp(loginDto.phoneNumber, loginDto.otp);
    if (!isValidOtp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const user = await this.usersService.findByPhone(loginDto.phoneNumber);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    let device = await this.devicesService.findByUserAndDeviceId(user.id, loginDto.deviceId);
    
    if (!device) {
      device = await this.devicesService.create({
        userId: user.id,
        deviceId: loginDto.deviceId,
        deviceName: loginDto.deviceName || 'Device',
        deviceType: loginDto.deviceType || 'android',
        isPrimary: false,
      });
    } else {
      await this.devicesService.update(device.id, {
        lastSeen: new Date(),
        isActive: true,
      });
    }

    const tokens = await this.generateTokens(user.id, user.phoneNumber, device.id);

    return {
      ...tokens,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
      },
    };
  }

  // Bug #15 fix: Removed useless bcrypt.hash() call - tokenHash was computed but never used
  async refreshTokens(refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'refresh-secret-key',
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user.id, user.phoneNumber, payload.deviceId);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, deviceId?: string): Promise<void> {
    if (deviceId) {
      const device = await this.devicesService.findByUserAndDeviceId(userId, deviceId);
      if (device) {
        await this.devicesService.update(device.id, { isActive: false });
      }
    }
    
    await this.databaseService.deleteRefreshTokensByUserId(userId);
  }

    async validateUser(phoneNumber: string): Promise<{ id: string; phoneNumber: string } | null> {
      const user = await this.usersService.findByPhone(phoneNumber);
      if (user) {
        return { id: user.id, phoneNumber: user.phoneNumber };
      }
      return null;
    }

    async createQrPairingSession(webDeviceId: string, webPublicKey?: string): Promise<{ pairingCode: string; expiresAt: Date }> {
      const pairingCode = this.generatePairingCode();
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

      const session: QrPairingSession = {
        pairingCode,
        webDeviceId,
        webPublicKey,
        createdAt: new Date(),
        expiresAt,
        status: 'pending',
      };

      this.qrPairingSessions.set(pairingCode, session);

      setTimeout(() => {
        const s = this.qrPairingSessions.get(pairingCode);
        if (s && s.status === 'pending') {
          s.status = 'expired';
        }
      }, 2 * 60 * 1000);

      return { pairingCode, expiresAt };
    }

    async getQrPairingStatus(pairingCode: string): Promise<{ status: string; tokens?: AuthTokens; user?: { id: string; phoneNumber: string; displayName: string } }> {
      const session = this.qrPairingSessions.get(pairingCode);
    
      if (!session) {
        return { status: 'not_found' };
      }

      if (new Date() > session.expiresAt) {
        session.status = 'expired';
        return { status: 'expired' };
      }

      if (session.status === 'completed' && session.userId) {
        const user = await this.usersService.findById(session.userId);
        if (user) {
          const tokens = await this.generateTokens(user.id, user.phoneNumber, session.webDeviceId);
          this.qrPairingSessions.delete(pairingCode);
          return {
            status: 'completed',
            tokens,
            user: {
              id: user.id,
              phoneNumber: user.phoneNumber,
              displayName: user.displayName,
            },
          };
        }
      }

      return { status: session.status };
    }

    async confirmQrPairing(
      pairingCode: string,
      userId: string,
      mobileDeviceId: string,
    ): Promise<{ success: boolean; message: string }> {
      const session = this.qrPairingSessions.get(pairingCode);
    
      if (!session) {
        return { success: false, message: 'Pairing session not found' };
      }

      if (new Date() > session.expiresAt) {
        session.status = 'expired';
        return { success: false, message: 'Pairing session expired' };
      }

      if (session.status !== 'pending' && session.status !== 'scanned') {
        return { success: false, message: 'Invalid pairing session status' };
      }

      const user = await this.usersService.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      await this.devicesService.create({
        userId,
        deviceId: session.webDeviceId,
        deviceName: 'Web Browser',
        deviceType: 'web',
        isPrimary: false,
      });

      session.status = 'completed';
      session.userId = userId;

      return { success: true, message: 'Device linked successfully' };
    }

    private generatePairingCode(): string {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    }

    private async generateTokens(userId: string, phoneNumber: string, deviceId?: string): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: userId,
      phone: phoneNumber,
      deviceId,
    };

    const accessToken = this.jwtService.sign(payload);
    
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'refresh-secret-key',
      expiresIn: 604800,
    });

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.databaseService.createRefreshToken({
      userId,
      deviceId: deviceId || null,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 2592000,
    };
  }
}
