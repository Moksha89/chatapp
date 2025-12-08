import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Hello, how are you?', description: 'Message content (plaintext or for display)' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Encrypted message content (ciphertext)' })
  @IsString()
  @IsOptional()
  ciphertext?: string;

  @ApiPropertyOptional({ enum: ['text', 'image', 'file', 'audio'], description: 'Message type' })
  @IsString()
  @IsOptional()
  @IsIn(['text', 'image', 'file', 'audio'])
  type?: 'text' | 'image' | 'file' | 'audio';

  @ApiPropertyOptional({ description: 'Temporary ID for message tracking' })
  @IsString()
  @IsOptional()
  tempId?: string;
}
