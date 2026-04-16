import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuickReplyDto {
  @ApiProperty({ example: '/greet', description: 'Shortcode (must start with /)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\/[a-zA-Z0-9_]+$/, { message: 'Shortcode must start with / and contain only alphanumeric characters and underscores' })
  shortcode: string;

  @ApiProperty({ example: 'Hello! How can we help you today?', description: 'Quick reply message' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
