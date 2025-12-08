import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { DevicesService } from '../devices/devices.service';
import { UploadKeysDto } from './dto/upload-keys.dto';

export interface KeyBundle {
  identityKey: string;
  signedPrekey: {
    keyId: number;
    publicKey: string;
    signature: string;
  };
  oneTimePrekey?: {
    keyId: number;
    publicKey: string;
  };
}

@Injectable()
export class CryptoService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly devicesService: DevicesService,
  ) {}

  async uploadKeys(userId: string, deviceId: string, data: UploadKeysDto): Promise<{ success: boolean }> {
    const device = await this.devicesService.findByUserAndDeviceId(userId, deviceId);
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.devicesService.updateKeys(device.id, {
      identityPublicKey: data.identityKey,
      signedPrekeyPublic: data.signedPrekey.publicKey,
      signedPrekeySignature: data.signedPrekey.signature,
    });

    if (data.oneTimePrekeys && data.oneTimePrekeys.length > 0) {
      for (const otpk of data.oneTimePrekeys) {
        this.databaseService.createOneTimePrekey({
          deviceId: device.id,
          keyId: otpk.keyId,
          publicKey: otpk.publicKey,
          isUsed: false,
        });
      }
    }

    return { success: true };
  }

  async getPublicKeys(userId: string): Promise<{ devices: Array<{ deviceId: string; identityKey: string | null }> }> {
    const devices = await this.devicesService.findByUserId(userId);
    
    return {
      devices: devices.map((d) => ({
        deviceId: d.deviceId,
        identityKey: d.identityPublicKey,
      })),
    };
  }

  async getKeyBundle(userId: string, deviceId?: string): Promise<KeyBundle | null> {
    const devices = await this.devicesService.findByUserId(userId);
    
    let targetDevice = deviceId
      ? devices.find((d) => d.deviceId === deviceId)
      : devices.find((d) => d.isPrimary) || devices[0];

    if (!targetDevice || !targetDevice.identityPublicKey || !targetDevice.signedPrekeyPublic) {
      return null;
    }

    const oneTimePrekey = this.databaseService.findUnusedPrekeyByDeviceId(targetDevice.id);

    const bundle: KeyBundle = {
      identityKey: targetDevice.identityPublicKey,
      signedPrekey: {
        keyId: 1,
        publicKey: targetDevice.signedPrekeyPublic,
        signature: targetDevice.signedPrekeySignature || '',
      },
    };

    if (oneTimePrekey) {
      bundle.oneTimePrekey = {
        keyId: oneTimePrekey.keyId,
        publicKey: oneTimePrekey.publicKey,
      };
      this.databaseService.markPrekeyAsUsed(oneTimePrekey.id);
    }

    return bundle;
  }

  async getPrekeyCount(userId: string, deviceId: string): Promise<{ count: number }> {
    const device = await this.devicesService.findByUserAndDeviceId(userId, deviceId);
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const count = this.databaseService.countUnusedPrekeysByDeviceId(device.id);
    return { count };
  }
}
