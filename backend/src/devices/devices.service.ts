import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Device } from '../database/database.service';

@Injectable()
export class DevicesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(data: {
    userId: string;
    deviceId: string;
    deviceName: string;
    deviceType: 'android' | 'web' | 'ios';
    isPrimary: boolean;
  }): Promise<Device> {
    return this.databaseService.createDevice({
      userId: data.userId,
      deviceId: data.deviceId,
      deviceName: data.deviceName,
      deviceType: data.deviceType,
      identityPublicKey: null,
      signedPrekeyPublic: null,
      signedPrekeySignature: null,
      isPrimary: data.isPrimary,
      lastSeen: new Date(),
      isActive: true,
    });
  }

  async findById(id: string): Promise<Device | undefined> {
    return this.databaseService.findDeviceById(id);
  }

  async findByUserId(userId: string): Promise<Device[]> {
    return this.databaseService.findDevicesByUserId(userId);
  }

  async findByUserAndDeviceId(userId: string, deviceId: string): Promise<Device | undefined> {
    return this.databaseService.findDeviceByUserAndDeviceId(userId, deviceId);
  }

  async update(id: string, data: Partial<Device>): Promise<Device> {
    const device = await this.findById(id);
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const updated = await this.databaseService.updateDevice(id, data);
    if (!updated) {
      throw new NotFoundException('Device not found');
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    const device = await this.findById(id);
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.databaseService.deleteDevice(id);
  }

  async updateKeys(
    id: string,
    keys: {
      identityPublicKey: string;
      signedPrekeyPublic: string;
      signedPrekeySignature: string;
    },
  ): Promise<Device> {
    return this.update(id, keys);
  }

  async getActiveDevices(userId: string): Promise<Device[]> {
    const devices = await this.findByUserId(userId);
    return devices.filter((d) => d.isActive);
  }
}
