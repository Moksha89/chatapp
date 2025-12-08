import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLabelDto {
  @ApiPropertyOptional({ example: 'VIP Customer', description: 'Label name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '#FF5733', description: 'Label color (hex)' })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color' })
  color?: string;
}
