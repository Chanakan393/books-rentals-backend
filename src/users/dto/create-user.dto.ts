import { IsString, IsEmail, MinLength, IsOptional, IsEnum } from 'class-validator';

export class CreateUserDto {
  @IsString()
  username: string; // ชื่อที่อยากให้โชว์ในระบบ

  @IsEmail()
  email: string; // เมลหลักที่ใช้ Login

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  phoneNumber: string; // เบอร์โทร

  @IsString()
  @IsOptional()
  address: string; // ที่อยู่
}