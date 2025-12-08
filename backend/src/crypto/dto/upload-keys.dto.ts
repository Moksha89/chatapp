import { IsString, IsNotEmpty, IsArray, IsOptional, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SignedPrekeyDto {
  @ApiProperty({ description: 'Key ID' })
  @IsNumber()
  keyId: number;

  @ApiProperty({ description: 'Public key (base64)' })
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty({ description: 'Signature (base64)' })
  @IsString()
  @IsNotEmpty()
  signature: string;
}

class OneTimePrekeyDto {
  @ApiProperty({ description: 'Key ID' })
  @IsNumber()
  keyId: number;

  @ApiProperty({ description: 'Public key (base64)' })
  @IsString()
  @IsNotEmpty()
  publicKey: string;
}

export class UploadKeysDto {
  @ApiProperty({ description: 'Identity public key (base64)' })
  @IsString()
  @IsNotEmpty()
  identityKey: string;

  @ApiProperty({ type: SignedPrekeyDto, description: 'Signed prekey' })
  @ValidateNested()
  @Type(() => SignedPrekeyDto)
  signedPrekey: SignedPrekeyDto;

  @ApiPropertyOptional({ type: [OneTimePrekeyDto], description: 'One-time prekeys' })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OneTimePrekeyDto)
  oneTimePrekeys?: OneTimePrekeyDto[];
}
