import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RentalsService } from './rentals.service';
import { RentalsController } from './rentals.controller';
import { Rental, RentalSchema } from './entities/rental.entity';
import { Book, BookSchema } from '../books/entities/book.entity';
import { Payment, PaymentSchema } from '../payment/entities/payment.entity'; 

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Rental.name, schema: RentalSchema },
      { name: Book.name, schema: BookSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [RentalsController],
  providers: [RentalsService],
  exports: [RentalsService],
})
export class RentalsModule {}