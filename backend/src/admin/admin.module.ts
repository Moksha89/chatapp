import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AuditLogEntity } from './audit-log.entity';
import {
  UserEntity,
  DeviceEntity,
  ChatEntity,
  ChatParticipantEntity,
  MessageEntity,
  LabelEntity,
  BusinessProfileEntity,
  QuickReplyEntity,
  RefreshTokenEntity,
  ChatbotConfigEntity,
  OrderEntity,
  StickerEntity,
  FaqEntity,
  PageContentEntity,
  ContactSubmissionEntity,
  ReportCategoryEntity,
  AppSettingEntity,
} from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLogEntity,
      UserEntity,
      DeviceEntity,
      ChatEntity,
      ChatParticipantEntity,
      MessageEntity,
      LabelEntity,
      BusinessProfileEntity,
      QuickReplyEntity,
      RefreshTokenEntity,
      ChatbotConfigEntity,
      OrderEntity,
      StickerEntity,
      FaqEntity,
      PageContentEntity,
      ContactSubmissionEntity,
      ReportCategoryEntity,
      AppSettingEntity,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'admin-jwt-secret-key',
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard],
})
export class AdminModule {}
