import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchUserDto {
  @ApiProperty({ example: '+1234', description: 'Phone number to search' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}
