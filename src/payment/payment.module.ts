import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment, PaymentSchema } from './entities/payment.entity'; 
import { Rental, RentalSchema } from '../rentals/entities/rental.entity'; 

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Rental.name, schema: RentalSchema },
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentsService],
  exports: [PaymentsService], 
})
export class PaymentModule {}