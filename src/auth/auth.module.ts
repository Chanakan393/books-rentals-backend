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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService], 
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET') || 'fallback_secret'
      }),
    }),
  ],
  controllers: [AuthController], // 🎯 ต้องมีบรรทัดนี้ เพื่อให้ NestJS รู้จักเส้นทาง API
  providers: [AuthService, JwtStrategy], // 🎯 ต้องมี AuthService และ Strategy
  exports: [AuthService], // เผื่อ Module อื่นต้องใช้
})
export class AuthModule {}