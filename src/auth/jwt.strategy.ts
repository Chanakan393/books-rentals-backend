import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'default_secret_key', // ต้องตรงกับ AuthModule
    });
  }

  async validate(payload: any) {
    // ✅ จุดสำคัญ: แปลง payload.sub ให้เป็น userId
    return { 
      userId: payload.sub, 
      username: payload.username, 
      role: payload.role 
    };
  }
}