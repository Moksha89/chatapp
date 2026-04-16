import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChatsModule } from './chats/chats.module';
import { WebsocketModule } from './websocket/websocket.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthController } from './health.controller';
import { User } from './entities/user.entity';
import { Chat } from './entities/chat.entity';
import { ChatParticipant } from './entities/chat-participant.entity';
import { Message } from './entities/message.entity';
import { Device } from './entities/device.entity';
import { QrSession } from './entities/qr-session.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'chatapp',
      password: process.env.DB_PASSWORD || 'chatapp_password',
      database: process.env.DB_NAME || 'chatapp',
      entities: [User, Chat, ChatParticipant, Message, Device, QrSession],
      synchronize: true, // Auto-create tables (disable in production)
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'default-jwt-secret-change-me',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '30d' },
    }),
    AuthModule,
    UsersModule,
    ChatsModule,
    WebsocketModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
