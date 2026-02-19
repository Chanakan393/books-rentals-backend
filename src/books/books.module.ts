import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { Book, BookSchema } from './entities/book.entity';

@Module({
  imports: [MongooseModule.forFeature([{ name: Book.name, schema: BookSchema }])],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [MongooseModule], // Export เพื่อให้ Module อื่นเรียกใช้ Model ได้
})
export class BooksModule {}