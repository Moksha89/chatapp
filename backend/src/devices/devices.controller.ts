import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';
import { RegisterDeviceDto } from './dto/register-device.dto';

@ApiTags('Devices')
@Controller('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @ApiOperation({ summary: 'List user devices' })
  @ApiResponse({ status: 200, description: 'Devices retrieved successfully' })
  async listDevices(@CurrentUser() user: CurrentUserData) {
    const devices = await this.devicesService.findByUserId(user.id);
    return devices.map((d) => ({
      id: d.id,
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      deviceType: d.deviceType,
      isPrimary: d.isPrimary,
      isActive: d.isActive,
      lastSeen: d.lastSeen,
    }));
  }

  @Post()
  @ApiOperation({ summary: 'Register a new device' })
  @ApiResponse({ status: 201, description: 'Device registered successfully' })
  async registerDevice(
    @CurrentUser() user: CurrentUserData,
    @Body() registerDeviceDto: RegisterDeviceDto,
  ) {
    const device = await this.devicesService.create({
      userId: user.id,
      deviceId: registerDeviceDto.deviceId,
      deviceName: registerDeviceDto.deviceName,
      deviceType: registerDeviceDto.deviceType,
      isPrimary: false,
    });

    return {
      id: device.id,
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      isPrimary: device.isPrimary,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a device' })
  @ApiResponse({ status: 200, description: 'Device removed successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async removeDevice(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    const device = await this.devicesService.findById(id);
    if (!device || device.userId !== user.id) {
      return { message: 'Device not found' };
    }

    await this.devicesService.delete(id);
    return { message: 'Device removed successfully' };
  }
}
