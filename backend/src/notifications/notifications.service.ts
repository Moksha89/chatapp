import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma-service/prisma.service';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private firebaseInitialized = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.initFirebase();
  }

  private initFirebase() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
        this.firebaseInitialized = true;
        console.log('Firebase Admin SDK initialized');
      } catch (err) {
        console.error('Firebase init error:', (err as Error).message);
      }
    } else {
      console.log('Firebase not configured — push notifications disabled');
    }
  }

  async registerDevice(userId: string, fcmToken: string, platform: string) {
    // Upsert device by fcmToken
    const existing = await this.prisma.device.findFirst({
      where: { fcmToken },
    });

    if (existing) {
      return this.prisma.device.update({
        where: { id: existing.id },
        data: { userId, platform, lastSeen: new Date() },
      });
    }

    return this.prisma.device.create({
      data: { userId, fcmToken, platform },
    });
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    if (!this.firebaseInitialized) return;

    const devices = await this.prisma.device.findMany({
      where: { userId, fcmToken: { not: null } },
    });

    if (devices.length === 0) return;

    const tokens = devices
      .map((d) => d.fcmToken)
      .filter((t): t is string => t !== null);

    if (tokens.length === 0) return;

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: { title, body },
        data: data || {},
        android: {
          priority: 'high',
          notification: { channelId: 'messages', priority: 'high' },
        },
      };

      const result = await admin.messaging().sendEachForMulticast(message);
      console.log(`FCM: ${result.successCount} sent, ${result.failureCount} failed for user ${userId}`);

      // Clean up invalid tokens
      result.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
          this.prisma.device.deleteMany({ where: { fcmToken: tokens[idx] } }).catch(() => {});
        }
      });
    } catch (err) {
      console.error('FCM send error:', (err as Error).message);
    }
  }

  async sendCallNotification(
    userId: string,
    callerName: string,
    callType: 'AUDIO' | 'VIDEO',
    chatId: string,
  ) {
    await this.sendPushNotification(
      userId,
      `Incoming ${callType.toLowerCase()} call`,
      `${callerName} is calling you`,
      { type: 'call', chatId, callType },
    );
  }

  async sendMessageNotification(
    userId: string,
    senderName: string,
    messageText: string,
    chatId: string,
  ) {
    await this.sendPushNotification(
      userId,
      senderName,
      messageText || 'Sent a media message',
      { type: 'message', chatId },
    );
  }
}
