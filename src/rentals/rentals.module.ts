import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RentalsService } from './rentals.service';
import { RentalsController } from './rentals.controller';
import { Rental, RentalSchema } from './entities/rental.entity';
import { Book, BookSchema } from '../books/entities/book.entity';
// ✅ 1. อย่าลืม import สองบรรทัดนี้เข้ามา
import { Payment, PaymentSchema } from '../payment/entities/payment.entity'; 

@Module({
  imports: [
    // ✅ 2. เพิ่ม Payment เข้าไปในลิสต์ forFeature
    MongooseModule.forFeature([
      { name: Rental.name, schema: RentalSchema },
      { name: Book.name, schema: BookSchema },
      { name: Payment.name, schema: PaymentSchema }, // 👈 เพิ่มบรรทัดนี้ครับ
    ]),
  ],
  controllers: [RentalsController],
  providers: [RentalsService],
  exports: [RentalsService],
})
export class RentalsModule {}