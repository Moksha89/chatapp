import { Controller, Get, Post, Query, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';

@ApiTags('Backup')
@Controller('backup')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('chats/:chatId/export')
  @ApiOperation({ summary: 'Export chat data for backup' })
  @ApiResponse({ status: 200, description: 'Chat data exported' })
  async exportChat(
    @CurrentUser() user: CurrentUserData,
    @Param('chatId') chatId: string,
    @Query('format') format?: string,
    @Query('includeMedia') includeMedia?: string,
  ) {
    return this.backupService.exportChatData(chatId, user.id, {
      format: format === 'json' ? 'json' : 'text',
      includeMedia: includeMedia === 'true',
    });
  }

  @Get('google/auth')
  @ApiOperation({ summary: 'Get Google Drive OAuth URL' })
  @ApiResponse({ status: 200, description: 'Auth URL returned' })
  async getGoogleAuthUrl() {
    return this.backupService.getGoogleDriveAuthUrl();
  }

  @Post('google/callback')
  @ApiOperation({ summary: 'Exchange Google OAuth code for tokens' })
  @ApiResponse({ status: 200, description: 'Tokens returned' })
  async googleCallback(@Body() body: { code: string }) {
    return this.backupService.exchangeGoogleCode(body.code);
  }

  @Post('google/upload')
  @ApiOperation({ summary: 'Upload backup to Google Drive' })
  @ApiResponse({ status: 200, description: 'Backup uploaded to Drive' })
  async uploadToGoogleDrive(
    @CurrentUser() user: CurrentUserData,
    @Param('chatId') chatId: string,
    @Body() body: { accessToken: string; chatId: string; format?: string; includeMedia?: boolean },
  ) {
    const exported = await this.backupService.exportChatData(body.chatId, user.id, {
      format: body.format === 'json' ? 'json' : 'text',
      includeMedia: body.includeMedia,
    });

    return this.backupService.uploadToGoogleDrive(
      body.accessToken,
      exported.filename,
      exported.content,
      exported.mimeType,
    );
  }
}
