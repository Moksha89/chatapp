import { Controller, Get, Post, Body, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CryptoService } from './crypto.service';
import { UploadKeysDto } from './dto/upload-keys.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';

@ApiTags('Crypto')
@Controller('crypto')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CryptoController {
  constructor(private readonly cryptoService: CryptoService) {}

  @Post('keys')
  @ApiOperation({ summary: 'Upload public keys' })
  @ApiResponse({ status: 200, description: 'Keys uploaded successfully' })
  async uploadKeys(
    @CurrentUser() user: CurrentUserData,
    @Body() uploadKeysDto: UploadKeysDto,
  ) {
    if (!user.deviceId) {
      throw new NotFoundException('Device ID not found in token');
    }
    return this.cryptoService.uploadKeys(user.id, user.deviceId, uploadKeysDto);
  }

  @Get('keys/:userId')
  @ApiOperation({ summary: 'Get user public keys' })
  @ApiResponse({ status: 200, description: 'Public keys retrieved successfully' })
  async getPublicKeys(@Param('userId') userId: string) {
    return this.cryptoService.getPublicKeys(userId);
  }

  @Get('prekeys/:userId')
  @ApiOperation({ summary: 'Get prekey bundle for session setup' })
  @ApiResponse({ status: 200, description: 'Prekey bundle retrieved successfully' })
  @ApiQuery({ name: 'deviceId', required: false, description: 'Specific device ID' })
  async getPrekeyBundle(
    @Param('userId') userId: string,
    @Query('deviceId') deviceId?: string,
  ) {
    const bundle = await this.cryptoService.getKeyBundle(userId, deviceId);
    if (!bundle) {
      throw new NotFoundException('No keys found for user');
    }
    return bundle;
  }

  @Get('prekeys/count')
  @ApiOperation({ summary: 'Get remaining prekey count' })
  @ApiResponse({ status: 200, description: 'Prekey count retrieved successfully' })
  async getPrekeyCount(@CurrentUser() user: CurrentUserData) {
    if (!user.deviceId) {
      throw new NotFoundException('Device ID not found in token');
    }
    return this.cryptoService.getPrekeyCount(user.id, user.deviceId);
  }
}
