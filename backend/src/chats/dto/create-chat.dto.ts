import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
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

  @ApiPropertyOptional({ example: 'Team Chat', description: 'Chat name (for group chats)' })
  @IsString()
  @IsOptional()
  name?: string;
}
