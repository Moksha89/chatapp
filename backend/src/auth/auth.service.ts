import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { DevicesService } from '../devices/devices.service';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

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

@Injectable()
export class AuthService {
  private otpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();

  constructor(
    private readonly usersService: UsersService,
    private readonly devicesService: DevicesService,
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async sendOtp(phoneNumber: string): Promise<{ message: string; otp?: string }> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    this.otpStore.set(phoneNumber, { otp, expiresAt });

    console.log(`[MOCK SMS] OTP for ${phoneNumber}: ${otp}`);

    return {
      message: 'OTP sent successfully',
      otp: this.configService.get('NODE_ENV') === 'development' ? otp : undefined,
    };
  }

  async verifyOtp(phoneNumber: string, otp: string): Promise<boolean> {
    const stored = this.otpStore.get(phoneNumber);
    
    if (!stored) {
      return false;
    }

    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(phoneNumber);
      return false;
    }

    if (stored.otp !== otp) {
      return false;
    }

    this.otpStore.delete(phoneNumber);
    return true;
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

  async refreshTokens(refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
    const tokenHash = await bcrypt.hash(refreshTokenDto.refreshToken, 10);
    
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
    
    this.databaseService.deleteRefreshTokensByUserId(userId);
  }

  async validateUser(phoneNumber: string): Promise<{ id: string; phoneNumber: string } | null> {
    const user = await this.usersService.findByPhone(phoneNumber);
    if (user) {
      return { id: user.id, phoneNumber: user.phoneNumber };
    }
    return null;
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
    this.databaseService.createRefreshToken({
      userId,
      deviceId: deviceId || null,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }
}
