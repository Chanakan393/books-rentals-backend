import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment, PaymentSchema } from './entities/payment.entity'; // เช็ค path ให้ถูก
import { Rental, RentalSchema } from '../rentals/entities/rental.entity'; // ต้องใช้ RentalModel ด้วย

@Module({
  imports: [
    // ✅ ต้องมีบรรทัดนี้เพื่อให้ PaymentsService ดึง Model ไปใช้ได้
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Rental.name, schema: RentalSchema },
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentsService],
  exports: [PaymentsService], // เผื่อโมดูลอื่นอยากเรียกใช้
})
export class PaymentModule {}