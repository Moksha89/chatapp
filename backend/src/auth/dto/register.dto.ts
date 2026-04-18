import { IsString, IsNotEmpty, Matches, Length, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone must be in E.164 format' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  displayName: string;

  @IsOptional()
  @IsString()
  profilePhoto?: string;
}
