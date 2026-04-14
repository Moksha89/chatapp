import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import { FcmTokenEntity } from '../database/entities/fcm-token.entity';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private firebaseApp: admin.app.App | null = null;

  constructor(
    @InjectRepository(FcmTokenEntity)
    private fcmTokenRepository: Repository<FcmTokenEntity>,
  ) {}

  async onModuleInit() {
    try {
      // Check multiple possible locations for the Firebase service account file
      const possiblePaths = [
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
        path.join(process.cwd(), 'firebase-service-account.json'),
        path.join(__dirname, '..', '..', 'firebase-service-account.json'),
      ].filter(Boolean) as string[];
      const serviceAccountPath = possiblePaths.find(p => fs.existsSync(p)) || '';
      if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase Admin SDK initialized successfully');
      } else {
        console.warn('Firebase service account not found, push notifications disabled');
      }
    } catch (error) {
      console.warn('Failed to initialize Firebase:', error);
    }
  }

  async registerToken(userId: string, token: string, platform: string = 'web'): Promise<void> {
    const existing = await this.fcmTokenRepository.findOne({
      where: { userId, token },
    });
    if (!existing) {
      await this.fcmTokenRepository.save(
        this.fcmTokenRepository.create({ userId, token, platform }),
      );
    } else {
      await this.fcmTokenRepository.update(existing.id, { lastUsedAt: new Date() });
    }
  }

  async unregisterToken(userId: string, token: string): Promise<void> {
    await this.fcmTokenRepository.delete({ userId, token });
  }

  async getTokensForUser(userId: string): Promise<string[]> {
    const tokenEntities = await this.fcmTokenRepository.find({ where: { userId } });
    return tokenEntities.map(t => t.token);
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.firebaseApp) return;

    const tokens = await this.getTokensForUser(userId);
    if (tokens.length === 0) return;

    try {
      // Separate tokens by platform for different message strategies
      const tokenEntities = await this.fcmTokenRepository.find({ where: { userId } });
      const androidTokens = tokenEntities.filter(t => t.platform === 'android').map(t => t.token);
      const webTokens = tokenEntities.filter(t => t.platform !== 'android').map(t => t.token);

      const responses: { success: boolean }[] = [];
      const allTokens = [...androidTokens, ...webTokens];

      // Android: Use data-only messages so the app handles notification display
      // This ensures notifications work even when app is killed/background
      if (androidTokens.length > 0) {
        const androidMessage: admin.messaging.MulticastMessage = {
          tokens: androidTokens,
          data: {
            ...(data || {}),
            title,
            body,
            senderName: title,
            content: body,
          },
          android: {
            priority: 'high',
          },
        };
        const androidResp = await this.firebaseApp.messaging().sendEachForMulticast(androidMessage);
        responses.push(...androidResp.responses);
      }

      // Web: Use notification + data messages (web needs notification payload)
      if (webTokens.length > 0) {
        const webMessage: admin.messaging.MulticastMessage = {
          tokens: webTokens,
          notification: {
            title,
            body,
          },
          data: data || {},
          webpush: {
            notification: {
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: data?.chatId || 'default',
            },
          },
        };
        const webResp = await this.firebaseApp.messaging().sendEachForMulticast(webMessage);
        responses.push(...webResp.responses);
      }

      // Clean up invalid tokens from database
      const failedTokens: string[] = [];
      responses.forEach((resp, idx) => {
        if (!resp.success && allTokens[idx]) {
          failedTokens.push(allTokens[idx]);
        }
      });
      if (failedTokens.length > 0) {
        for (const invalidToken of failedTokens) {
          await this.fcmTokenRepository.delete({ userId, token: invalidToken });
        }
      }
      console.log(`Push notification sent to ${userId}: ${responses.filter(r => r.success).length}/${responses.length} succeeded`);
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  async sendMessageNotification(
    recipientUserId: string,
    senderName: string,
    messageContent: string,
    chatId: string,
    messageType: string,
  ): Promise<void> {
    let body = messageContent;
    if (messageType === 'image') body = '📷 Photo';
    else if (messageType === 'video') body = '📹 Video';
    else if (messageType === 'audio') body = '🎵 Voice message';
    else if (messageType === 'file') body = '📎 Document';
    else if (messageType === 'location') body = '📍 Location';
    else if (messageType === 'contact') body = '👤 Contact';
    else if (messageType === 'poll') body = '📊 Poll';
    else if (messageType === 'sticker') body = '🏷️ Sticker';
    else if (messageType === 'order') body = '🛒 Order';

    await this.sendPushNotification(recipientUserId, senderName, body, {
      chatId,
      type: 'message',
      senderName,
      content: body,
    });
  }

  async sendCallNotification(
    recipientUserId: string,
    callerName: string,
    callType: 'audio' | 'video',
  ): Promise<void> {
    await this.sendPushNotification(
      recipientUserId,
      `${callerName}`,
      `Incoming ${callType} call...`,
      { type: 'call', callType },
    );
  }
}
