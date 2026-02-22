import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService
    ) { }

    // 1. ฟังก์ชันตรวจสอบ User (Validate) - ✅ อัปเกรดความปลอดภัยสูงสุด
    async validateUser(account: string, pass: string): Promise<any> {
        // 🚀 ดักจับกรณีที่หน้าบ้านส่งค่า account หรือรหัสผ่านว่างเปล่ามา
        if (!account || !pass) {
            return null;
        }

        const user = await this.usersService.findByLogin(account);

        // 🚀 ตรวจสอบอย่างรัดกุมว่ามี User และมีรหัสผ่านใน DB ให้เปรียบเทียบ
        if (user && user.password) {
            const isPasswordMatch = await bcrypt.compare(pass, user.password);
            if (isPasswordMatch) {
                const { password, ...result } = user.toObject();
                return result; // ถ้ารหัสถูก คืนค่าข้อมูล User ไปให้ Controller
            }
        }
        
        // ถ้ารหัสผิด จะข้ามเงื่อนไขด้านบนมาคืนค่า null ทันที!
        return null;
    }

    // 2. ฟังก์ชัน Login
    async login(user: any) {
        const tokens = await this.signTokens(user);

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(tokens.refresh_token, salt);
        await this.usersService.setRefreshTokenHash(user._id.toString(), hash);

        return {
            ...tokens,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        };
    }

    // 3. logout
    async logout(userId: string) {
        await this.usersService.setRefreshTokenHash(userId, null);
        return { message: 'ออกจากระบบเรียบร้อยแล้ว' };
    }

    async refreshTokens(userId: string, refreshToken: string) {
        const user = await this.usersService.findByIdWithRefresh(userId);
        if (!user || !user.refreshTokenHash) throw new ForbiddenException('Access denied');

        const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
        if (!matches) throw new ForbiddenException('Access denied');

        const tokens = await this.signTokens(user);

        const hash = await bcrypt.hash(tokens.refresh_token, 10);
        await this.usersService.setRefreshTokenHash(userId, hash);

        return tokens;
    }

    async signTokens(user: any) {
        const payload = { username: user.username, sub: user._id, role: user.role };

        const atTime = parseInt(this.configService.get('JWT_ACCESS_EXPIRATION') ?? '3600');
        const rtTime = parseInt(this.configService.get('JWT_REFRESH_EXPIRATION') ?? '604800');

        const [at, rt] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_ACCESS_SECRET'),
                expiresIn: atTime, 
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: rtTime, 
            }),
        ]);

        return { access_token: at, refresh_token: rt };
    }
}