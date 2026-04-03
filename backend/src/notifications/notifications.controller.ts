import { Controller, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('register-token')
  @ApiOperation({ summary: 'Register FCM push notification token' })
  async registerToken(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { token: string; platform?: string },
  ) {
    await this.notificationsService.registerToken(user.id, body.token, body.platform || 'web');
    return { success: true };
  }

  @Delete('unregister-token')
  @ApiOperation({ summary: 'Unregister FCM push notification token' })
  async unregisterToken(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { token: string },
  ) {
    await this.notificationsService.unregisterToken(user.id, body.token);
    return { success: true };
  }
}
