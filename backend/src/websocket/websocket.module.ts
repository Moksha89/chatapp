import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { ChatsModule } from '../chats/chats.module';
import { UsersModule } from '../users/users.module';
import { DevicesModule } from '../devices/devices.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => ChatsModule),
    UsersModule,
    forwardRef(() => DevicesModule),
    NotificationsModule,
    ScheduleModule.forRoot(),
  ],
  providers: [WebsocketGateway, WebsocketService],
  exports: [WebsocketService],
})
export class WebsocketModule {}
