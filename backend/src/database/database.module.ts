import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  UserEntity,
  DeviceEntity,
  ChatEntity,
  ChatParticipantEntity,
  MessageEntity,
  LabelEntity,
  ChatLabelEntity,
  BusinessProfileEntity,
  ContactEntity,
  QuickReplyEntity,
  OneTimePrekeyEntity,
  RefreshTokenEntity,
  WebSessionEntity,
} from './entities';
import { DatabaseService } from './database.service';

const entities = [
  UserEntity,
  DeviceEntity,
  ChatEntity,
  ChatParticipantEntity,
  MessageEntity,
  LabelEntity,
  ChatLabelEntity,
  BusinessProfileEntity,
  ContactEntity,
  QuickReplyEntity,
  OneTimePrekeyEntity,
  RefreshTokenEntity,
  WebSessionEntity,
];

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities,
            synchronize: configService.get<string>('NODE_ENV') !== 'production',
            logging: configService.get<string>('NODE_ENV') === 'development',
          };
        }
        
        return {
          type: 'better-sqlite3',
          database: ':memory:',
          entities,
          synchronize: true,
          logging: false,
        };
      },
    }),
    TypeOrmModule.forFeature(entities),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService, TypeOrmModule],
})
export class DatabaseModule {}
