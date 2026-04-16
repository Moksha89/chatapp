import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Display name' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg', description: 'Profile photo URL' })
  @IsString()
  @IsOptional()
  profilePhoto?: string;

  @ApiPropertyOptional({ example: 'Available', description: 'User status' })
  @IsString()
  @IsOptional()
  status?: string;
}
