import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private firebaseApp: admin.app.App | null = null;

  async onModuleInit() {
    try {
      const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
      if (fs.existsSync(serviceAccountPath)) {
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

  // Store FCM tokens (in-memory for now, could be persisted to DB)
  private fcmTokens: Map<string, string[]> = new Map();

  registerToken(userId: string, token: string): void {
    const tokens = this.fcmTokens.get(userId) || [];
    if (!tokens.includes(token)) {
      tokens.push(token);
      this.fcmTokens.set(userId, tokens);
    }
  }

  unregisterToken(userId: string, token: string): void {
    const tokens = this.fcmTokens.get(userId) || [];
    this.fcmTokens.set(userId, tokens.filter(t => t !== token));
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.firebaseApp) return;

    const tokens = this.fcmTokens.get(userId) || [];
    if (tokens.length === 0) return;

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
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
        android: {
          notification: {
            icon: '@mipmap/ic_launcher',
            channelId: 'messages',
          },
        },
      };

      const response = await this.firebaseApp.messaging().sendEachForMulticast(message);
      
      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            invalidTokens.push(tokens[idx]);
          }
        });
        if (invalidTokens.length > 0) {
          const validTokens = tokens.filter(t => !invalidTokens.includes(t));
          this.fcmTokens.set(userId, validTokens);
        }
      }
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
