import { Controller, Post, Body, UnauthorizedException, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('Authentication (ระบบล็อกอิน)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูข้อมูลโปรไฟล์จาก Token' })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req) {
    return req.user;
  }

  @ApiOperation({ summary: 'เข้าสู่ระบบ (Login)' })
  @ApiResponse({ status: 200, description: 'ล็อกอินสำเร็จ คืนค่า Access Token' })
  @ApiResponse({ status: 401, description: 'Username หรือ Password ผิด' })
  @Post('login')
  async login(@Body() body: { account: string; password: string }) {
    const user = await this.authService.validateUser(body.account, body.password);
    if (!user) {
      throw new UnauthorizedException('ข้อมูลเข้าสู่ระบบไม่ถูกต้อง');
    }
    return this.authService.login(user);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'ออกจากระบบ (Logout)' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.userId);
  }

  @ApiOperation({ summary: 'ขอ Token ใหม่ (Refresh Token)' })
  @Post('refresh')
  async refresh(@Body() body: { userId: string, refreshToken: string }) {
    return this.authService.refreshTokens(body.userId, body.refreshToken);
  }
}