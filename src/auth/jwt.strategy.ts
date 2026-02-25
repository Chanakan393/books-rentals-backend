import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    // ตั้งค่าการอ่าน Token
    super({
      // ดึง Token ออกมาจาก Header ที่ชื่อว่า Bearer
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'default_secret_key',
    });
  }

  // แกะข้อมูลเตรียมให้ Controller
  async validate(payload: any) {
    // แปลงข้อมูลที่อยู่ใน Token กลับมาเป็น Object ให้เรียกใช้ผ่าน req.user
    return { 
      userId: payload.sub, 
      username: payload.username, 
      role: payload.role 
    };
  }
}