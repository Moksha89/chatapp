import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQuickReplyDto {
  @ApiPropertyOptional({ example: '/greet', description: 'Shortcode (must start with /)' })
  @IsString()
  @IsOptional()
  @Matches(/^\/[a-zA-Z0-9_]+$/, { message: 'Shortcode must start with / and contain only alphanumeric characters and underscores' })
  shortcode?: string;

  @ApiPropertyOptional({ example: 'Hello! How can we help you today?', description: 'Quick reply message' })
  @IsString()
  @IsOptional()
  message?: string;
}
