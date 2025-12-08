import { Controller, Post, Get, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, SendOtpDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RateLimitGuard, RateLimit } from '../common/guards/rate-limit.guard';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowMs: 60000, maxRequests: 5 })
  @ApiOperation({ summary: 'Send OTP to phone number' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    return this.authService.sendOtp(sendOtpDto.phoneNumber);
  }

  @Post('register')
  @RateLimit({ windowMs: 60000, maxRequests: 10 })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or user already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ windowMs: 60000, maxRequests: 10 })
  @ApiOperation({ summary: 'Login with phone number and OTP' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Request() req: { user: { id: string; deviceId?: string } }) {
    await this.authService.logout(req.user.id, req.user.deviceId);
    return { message: 'Logged out successfully' };
  }

  @Post('qr/create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create QR pairing session for web login' })
  @ApiResponse({ status: 200, description: 'QR pairing session created' })
  async createQrSession(@Body() body: { webDeviceId: string; webPublicKey?: string }) {
    return this.authService.createQrPairingSession(body.webDeviceId, body.webPublicKey);
  }

  @Get('qr/status/:pairingCode')
  @ApiOperation({ summary: 'Check QR pairing status' })
  @ApiResponse({ status: 200, description: 'Pairing status retrieved' })
  async getQrStatus(@Param('pairingCode') pairingCode: string) {
    return this.authService.getQrPairingStatus(pairingCode);
  }

  @Post('qr/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm QR pairing from mobile device' })
  @ApiResponse({ status: 200, description: 'Pairing confirmed' })
  async confirmQrPairing(
    @Request() req: { user: { id: string; deviceId?: string } },
    @Body() body: { pairingCode: string },
  ) {
    return this.authService.confirmQrPairing(
      body.pairingCode,
      req.user.id,
      req.user.deviceId || '',
    );
  }
}
