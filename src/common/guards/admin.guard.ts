import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

// ในไฟล์ admin.guard.ts
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // ✅ แก้จาก const userRole = request.headers['role'];
    // มาใช้ข้อมูลที่ได้จาก JwtAuthGuard แทน
    const user = request.user; 

    // ✅ ตรวจสอบ role จากตัวแปร user
    if (user && user.role === 'admin') {
      return true; 
    }

    throw new UnauthorizedException('คุณไม่มีสิทธิ์ใช้งานส่วนนี้ (Admin Only)');
  }
}