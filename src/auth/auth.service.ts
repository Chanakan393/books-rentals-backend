import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Document, DefaultSchemaOptions, Types } from 'mongoose';
import { UserDocument, User } from 'src/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService
    ) { }

    // 1. ฟังก์ชันตรวจสอบ User (Validate)
    async validateUser(account: string, pass: string): Promise<any> {
        // เรียกใช้ฟังก์ชันใหม่ที่เช็คทั้ง 2 field
        const user = await this.usersService.findByLogin(account);

        if (user && (await bcrypt.compare(pass, user.password))) {
            const { password, ...result } = user.toObject();
            return result;
        }
        return null;
    }

    // 2. ฟังก์ชัน Login (ปรับปรุง)
    async login(user: any) {
        // 🎟️ สร้าง Token ทั้ง Access และ Refresh ผ่านฟังก์ชันที่คุณเขียนไว้
        const tokens = await this.signTokens(user);

        // ✅ หัวใจสำคัญ: ต้องบันทึกกุญแจสำรอง (Refresh Token) ลง DB ด้วย 
        // ไม่งั้นฟังก์ชัน refreshTokens จะหาคนมาเปรียบเทียบไม่ได้ [cite: 17, 87]
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

    // 3. logout (ล้าง Refresh Token)
    async logout(userId: string) {
        await this.usersService.setRefreshTokenHash(userId, null);
        return { message: 'ออกจากระบบเรียบร้อยแล้ว' };
    }

    async refreshTokens(userId: string, refreshToken: string) {
        const user = await this.usersService.findByIdWithRefresh(userId);
        if (!user || !user.refreshTokenHash) throw new ForbiddenException('Access denied');

        // ตรวจสอบกุญแจสำรอง (เปรียบเทียบกับ Hash ใน DB)
        const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
        if (!matches) throw new ForbiddenException('Access denied');

        // ออก Token ชุดใหม่
        const tokens = await this.signTokens(user);

        // Rotation: บันทึก Hash ของกุญแจใบใหม่ทับใบเก่า
        const hash = await bcrypt.hash(tokens.refresh_token, 10);
        await this.usersService.setRefreshTokenHash(userId, hash);

        return tokens;
    }

    async signTokens(user: any) {
        const payload = { username: user.username, sub: user._id, role: user.role };

        // 3. ดึงค่าจาก .env ทีเดียวจบ (แปลงเป็นตัวเลขให้เสร็จตรงนี้)
        const atTime = parseInt(this.configService.get('JWT_ACCESS_EXPIRATION') ?? '60');
        const rtTime = parseInt(this.configService.get('JWT_REFRESH_EXPIRATION') ?? '604800');

        const [at, rt] = await Promise.all([
            // Access Token
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_ACCESS_SECRET'),
                expiresIn: atTime, // ✅ ใช้วินาทีที่ดึงมา
            }),
            // Refresh Token
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: rtTime, // ✅ ใช้วินาทีที่ดึงมา
            }),
        ]);

        return { access_token: at, refresh_token: rt };
    }
}