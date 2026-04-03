import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Hello, how are you?', description: 'Message content (plaintext or for display)' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Encrypted message content (ciphertext)' })
  @IsString()
  @IsOptional()
  ciphertext?: string;

  @ApiPropertyOptional({ enum: ['text', 'image', 'video', 'audio', 'video-note', 'file', 'poll', 'location', 'contact', 'sticker'], description: 'Message type' })
  @IsString()
  @IsOptional()
  @IsIn(['text', 'image', 'video', 'audio', 'video-note', 'file', 'poll', 'location', 'contact', 'sticker'])
  type?: 'text' | 'image' | 'video' | 'audio' | 'video-note' | 'file' | 'poll' | 'location' | 'contact' | 'sticker';

  @ApiPropertyOptional({ description: 'Media URL for attachments' })
  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'Media MIME type' })
  @IsString()
  @IsOptional()
  mediaType?: string;

  @ApiPropertyOptional({ description: 'Original filename' })
  @IsString()
  @IsOptional()
  mediaName?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsNumber()
  @IsOptional()
  mediaSize?: number;

  @ApiPropertyOptional({ description: 'Duration in seconds for audio/video' })
  @IsNumber()
  @IsOptional()
  mediaDuration?: number;

  @ApiPropertyOptional({ description: 'Temporary ID for message tracking' })
  @IsString()
  @IsOptional()
  tempId?: string;

  @ApiPropertyOptional({ description: 'ID of message being replied to' })
  @IsString()
  @IsOptional()
  replyToMessageId?: string;
}
