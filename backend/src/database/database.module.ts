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
  StatusEntity,
  BroadcastEntity,
  ProductEntity,
  AutoReplyEntity,
  FcmTokenEntity,
  ChatbotConfigEntity,
  OrderEntity,
  CallEntity,
  CallParticipantEntity,
  MessageStatusEntity,
  FriendEntity,
  StickerEntity,
  FaqEntity,
  PageContentEntity,
  ContactSubmissionEntity,
  ReportCategoryEntity,
  AppSettingEntity,
  MessageStarEntity,
} from './entities';
import { DatabaseService } from './database.service';
import { AuditLogEntity } from '../admin/audit-log.entity';

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
  StatusEntity,
  BroadcastEntity,
  ProductEntity,
  AutoReplyEntity,
  FcmTokenEntity,
  ChatbotConfigEntity,
  OrderEntity,
  CallEntity,
  CallParticipantEntity,
  MessageStatusEntity,
  FriendEntity,
  StickerEntity,
  FaqEntity,
  PageContentEntity,
  ContactSubmissionEntity,
  ReportCategoryEntity,
  AppSettingEntity,
  MessageStarEntity,
  AuditLogEntity,
];

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const nodeEnv = configService.get<string>('NODE_ENV');
        // In production, disable synchronize and use migrations instead
        // Set DB_SYNCHRONIZE=false in production after running migrations
        const synchronize = configService.get<string>('DB_SYNCHRONIZE') !== 'false';
        
        if (databaseUrl) {
          const poolSize = parseInt(configService.get<string>('DB_POOL_SIZE') || '20', 10);
          return {
            type: 'postgres',
            url: databaseUrl,
            entities,
            synchronize,
            migrationsRun: !synchronize,
            migrations: ['dist/database/migrations/*.js'],
            logging: nodeEnv === 'development',
            extra: {
              max: poolSize,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 5000,
            },
          };
        }
        
        const dbPath = configService.get<string>('SQLITE_DB_PATH') || 'chatapp.db';
        return {
          type: 'better-sqlite3',
          database: dbPath,
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
