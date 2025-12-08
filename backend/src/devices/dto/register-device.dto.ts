import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'device-uuid-123', description: 'Unique device identifier' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ example: 'Samsung Galaxy S21', description: 'Device name' })
  @IsString()
  @IsNotEmpty()
  deviceName: string;

  @ApiProperty({ enum: ['android', 'web', 'ios'], description: 'Device type' })
  @IsString()
  @IsIn(['android', 'web', 'ios'])
  deviceType: 'android' | 'web' | 'ios';
}
