import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  // ตรวจสิทธิ์ Admin
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; 

    if (user && user.role === 'admin') {
      return true;
    }

    throw new UnauthorizedException('คุณไม่มีสิทธิ์ใช้งานส่วนนี้ (Admin Only)');
  }
}