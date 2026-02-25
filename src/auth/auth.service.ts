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

    // ตรวจสอบว่ารหัสผ่านถูกไหม
    async validateUser(account: string, pass: string): Promise<any> {
        if (!account || !pass) return null;

        const user = await this.usersService.findByLogin(account);

        if (user && user.password) {
            // เทียบกับรหัสผ่านที่ถูกเข้ารหัส (Hash) ไว้ในฐานข้อมูล
            const isPasswordMatch = await bcrypt.compare(pass, user.password);
            if (isPasswordMatch) {
                const { password, ...result } = user.toObject();
                return result;
            }
        }
        return null;
    }

    async login(user: any) {
        // เรียกฟังก์ชัน signTokens เพื่อสร้างคู่ Access & Refresh Token
        const tokens = await this.signTokens(user);

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(tokens.refresh_token, salt);
        await this.usersService.setRefreshTokenHash(user._id.toString(), hash);

        return { ...tokens, user: { id: user._id, username: user.username, role: user.role } };
    }

    // ออกจากระบบด้วยการทำลาย Token
    async logout(userId: string) {
        // เคลียร์ค่า Refresh Token ใน DB ทิ้ง เพื่อไม่ให้เอาไปใช้ขอ Token ใหม่ได้อีก
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
            // นำข้อมูล User ไปประทับตราสร้างเป็น Token พร้อมระบุเวลาหมดอายุ
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