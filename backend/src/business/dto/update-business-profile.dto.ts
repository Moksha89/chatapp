import { IsString, IsOptional, IsEmail, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBusinessProfileDto {
  @ApiPropertyOptional({ example: 'Acme Corp', description: 'Business name' })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiPropertyOptional({ example: 'We sell everything', description: 'Business description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Retail', description: 'Business category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: '123 Main St, City', description: 'Business address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Mon-Fri 9AM-5PM', description: 'Business hours' })
  @IsString()
  @IsOptional()
  businessHours?: string;

  @ApiPropertyOptional({ example: 'contact@acme.com', description: 'Business email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'https://acme.com', description: 'Business website' })
  @IsUrl()
  @IsOptional()
  website?: string;
}
