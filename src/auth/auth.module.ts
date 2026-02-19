import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // ✅ 2. เปลี่ยนมาใช้ registerAsync ตามนี้ครับ
    JwtModule.registerAsync({
      imports: [ConfigModule], // 👈 สำคัญมาก! ต้องบอกว่าฉันจะใช้ ConfigModule นะ
      inject: [ConfigService], // 👈 ฉีด ConfigService เข้าไปใน useFactory
      useFactory: async (configService: ConfigService) => ({
        // ดึงค่าจาก .env หรือถ้าไม่มีให้ใช้ค่าสำรอง (ป้องกัน error)
        secret: configService.get<string>('JWT_ACCESS_SECRET') || 'fallback_secret'
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}