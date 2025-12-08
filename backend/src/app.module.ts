import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BusinessModule } from './business/business.module';
import { ContactsModule } from './contacts/contacts.module';
import { ChatsModule } from './chats/chats.module';
import { LabelsModule } from './labels/labels.module';
import { QuickRepliesModule } from './quick-replies/quick-replies.module';
import { DevicesModule } from './devices/devices.module';
import { MediaModule } from './media/media.module';
import { WebsocketModule } from './websocket/websocket.module';
import { CryptoModule } from './crypto/crypto.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    BusinessModule,
    ContactsModule,
    ChatsModule,
    LabelsModule,
    QuickRepliesModule,
    DevicesModule,
    MediaModule,
    WebsocketModule,
    CryptoModule,
  ],
})
export class AppModule {}
