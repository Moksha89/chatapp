import { IsArray, ValidateNested, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ContactItem {
  @ApiProperty({ example: 'John Doe', description: 'Contact name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+1234567890', description: 'Contact phone number' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

export class SyncContactsDto {
  @ApiProperty({ type: [ContactItem], description: 'Array of contacts to sync' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactItem)
  contacts: ContactItem[];
}
