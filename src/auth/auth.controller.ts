import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UseGuards, Get, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'; // Import Guard เข้ามา

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req) {
    // ระบบจะคืนค่า userId, username และ role ที่เราแกะมาจาก Token ครับ
    return req.user;
  }

  @Post('login')
  async login(@Body() body: { account: string; password: string }) {
    const user = await this.authService.validateUser(body.account, body.password);

    if (!user) {
      throw new UnauthorizedException('ข้อมูลเข้าสู่ระบบไม่ถูกต้อง');
    }

    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.userId);
  }

  @Post('refresh')
  async refresh(@Body() body: { userId: string, refreshToken: string }) {
    // รับค่า userId และ refreshToken ที่ส่งมาจากหน้าบ้าน (Postman)
    return this.authService.refreshTokens(body.userId, body.refreshToken);
  }
}