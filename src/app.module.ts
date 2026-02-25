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
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    // เชื่อมต่อฐานข้อมูล MongoDB
    MongooseModule.forRoot('mongodb+srv://books:books600@books.zzicbur.mongodb.net/books?retryWrites=true&w=majority'),
    
    // รวบรวม Module ย่อย
    AuthModule,
    UsersModule,
    BooksModule,
    RentalsModule,
    PaymentModule,
    CloudinaryModule,

    // เรียกใช้ตัวแปรในไฟล์ .env
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot([{ 
      ttl: 60_000,
      limit: 10,
    }]),
  ],

  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule { }