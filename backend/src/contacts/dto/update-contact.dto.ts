import { IsString, IsOptional, IsEmail, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateContactDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Contact name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'john@example.com', description: 'Contact email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Met at conference', description: 'Notes about the contact' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z', description: 'Last contact date' })
  @IsDateString()
  @IsOptional()
  lastContactDate?: string;
}
