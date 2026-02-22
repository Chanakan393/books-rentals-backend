import { IsString, IsEmail, MinLength, IsOptional, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  username: string; // ชื่อที่อยากให้โชว์ในระบบ

  @IsEmail()
  email: string; // เมลหลักที่ใช้ Login

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  password: string;

  @IsString()
  @IsOptional()
  phoneNumber: string; // เบอร์โทร

  @IsString()
  @IsOptional()
  @MinLength(10)
  address: string; // ที่อยู่
}