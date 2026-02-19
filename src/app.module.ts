import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { BooksModule } from './books/books.module';
import { RentalsModule } from './rentals/rentals.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    // ⚠️ อย่าลืมเปลี่ยน <password> เป็นรหัสผ่านของคุณ และชื่อ Database ตามต้องการ
    MongooseModule.forRoot('mongodb+srv://books:books600@books.zzicbur.mongodb.net/books?retryWrites=true&w=majority'),
    UsersModule,
    BooksModule,
    RentalsModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // ตั้งค่า rate limiting โดยใช้ ThrottlerModule
    ThrottlerModule.forRoot([ { ttl: 60_000, // 1 minute
    limit: 5, // 5 requests per minute
    },
  ]),
    PaymentModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule { }