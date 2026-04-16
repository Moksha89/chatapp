import { IsString, IsOptional, IsIn, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChatDto {
  @ApiProperty({ enum: ['direct', 'group'], description: 'Chat type' })
  @IsString()
  @IsIn(['direct', 'group'])
  type: 'direct' | 'group';

  @ApiPropertyOptional({ example: 'user-uuid', description: 'Participant user ID (required for direct chats)' })
  @IsString()
  @IsOptional()
  participantId?: string;

  @ApiPropertyOptional({ example: ['user-uuid-1', 'user-uuid-2'], description: 'Participant user IDs (for group chats)' })
  @IsArray()
  @IsOptional()
  participantIds?: string[];

  @ApiPropertyOptional({ example: 'Team Chat', description: 'Chat name (for group chats)' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Group icon URL' })
  @IsString()
  @IsOptional()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Group description' })
  @IsString()
  @IsOptional()
  description?: string;
}
