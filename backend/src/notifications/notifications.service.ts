import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: any = null;

  constructor(
    @InjectRepository(Device)
    private deviceRepo: Repository<Device>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (projectId && clientEmail && privateKey) {
        const admin = require('firebase-admin');
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
        this.logger.log('Firebase initialized');
      } else {
        this.logger.warn('Firebase not configured — push notifications disabled');
      }
    } catch (error) {
      this.logger.warn('Firebase init failed:', error.message);
    }
  }

  async sendMessageNotification(
    targetUserId: string,
    senderUserId: string,
    content: string,
    chatId: string,
  ): Promise<void> {
    if (!this.firebaseApp) return;

    const sender = await this.userRepo.findOne({ where: { id: senderUserId } });
    const devices = await this.deviceRepo.find({ where: { userId: targetUserId } });

    for (const device of devices) {
      if (!device.fcmToken) continue;

      try {
        const admin = require('firebase-admin');
        await admin.messaging().send({
          token: device.fcmToken,
          data: {
            type: 'message',
            chatId,
            senderId: senderUserId,
            senderName: sender?.displayName || sender?.phone || 'Unknown',
            content: content.substring(0, 200),
          },
          android: {
            priority: 'high' as const,
          },
        });
      } catch (error) {
        this.logger.warn(`FCM send failed for device ${device.id}: ${error.message}`);
        // Remove invalid token
        if (error.code === 'messaging/registration-token-not-registered') {
          await this.deviceRepo.delete(device.id);
        }
      }
    }
  }

  async sendCallNotification(
    targetUserId: string,
    callerName: string,
    callType: string,
  ): Promise<void> {
    if (!this.firebaseApp) return;

    const devices = await this.deviceRepo.find({ where: { userId: targetUserId } });

    for (const device of devices) {
      if (!device.fcmToken) continue;

      try {
        const admin = require('firebase-admin');
        await admin.messaging().send({
          token: device.fcmToken,
          data: {
            type: 'call',
            callerName,
            callType,
          },
          android: {
            priority: 'high' as const,
          },
        });
      } catch (error) {
        this.logger.warn(`Call notification failed: ${error.message}`);
      }
    }
  }
}
