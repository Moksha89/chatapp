import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '+1234567890', description: 'Phone number with country code' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: '123456', description: 'OTP received via SMS' })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({ example: 'device-uuid-123', description: 'Unique device identifier' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiPropertyOptional({ example: 'Samsung Galaxy S21', description: 'Device name' })
  @IsString()
  @IsOptional()
  deviceName?: string;

  @ApiPropertyOptional({ enum: ['android', 'web', 'ios'], description: 'Device type' })
  @IsString()
  @IsOptional()
  @IsIn(['android', 'web', 'ios'])
  deviceType?: 'android' | 'web' | 'ios';
}
