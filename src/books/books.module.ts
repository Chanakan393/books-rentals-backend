import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { Book, BookSchema } from './entities/book.entity';
import { Rental, RentalSchema } from '../rentals/entities/rental.entity'; 

@Module({
  imports: [
    // ผูก Schema ของ MongoDB เข้ากับ Module
    MongooseModule.forFeature([
      { name: Book.name, schema: BookSchema },
      // import RentalSchema เพราะ BooksService มีการนับยอดการเช่าเพื่อเช็คสต็อก
      { name: Rental.name, schema: RentalSchema } 
    ])
  ],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [MongooseModule], 
})
export class BooksModule {}