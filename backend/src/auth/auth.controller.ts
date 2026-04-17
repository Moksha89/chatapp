import { Controller, Post, Body, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('send-otp')
  async sendOtp(@Body('phone') phone: string) {
    return this.authService.sendOtp(phone);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() body: {
      phone: string;
      otp: string;
      deviceId: string;
      fcmToken?: string;
      platform?: string;
      displayName?: string;
    },
  ) {
    return this.authService.verifyOtp(
      body.phone,
      body.otp,
      body.deviceId,
      body.fcmToken,
      body.platform,
      body.displayName,
    );
  }

  @Get('qr/generate')
  async generateQr() {
    return this.authService.generateQrToken();
  }

  @Get('qr/status')
  async checkQrStatus(@Query('token') token: string) {
    return this.authService.checkQrStatus(token);
  }

  @Post('qr/scan')
  @UseGuards(AuthGuard)
  async scanQr(@Body('token') token: string, @Request() req: any) {
    return this.authService.scanQr(token, req.user.id);
  }
}
