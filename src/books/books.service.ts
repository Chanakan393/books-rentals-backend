import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose'; // 🚀 เพิ่ม isValidObjectId
import { Book, BookDocument } from './entities/book.entity';
import { CreateBookDto } from './dto/create-book.dto';

@Injectable()
export class BooksService {
  constructor(@InjectModel(Book.name) private bookModel: Model<BookDocument>) { }

  async create(createBookDto: CreateBookDto) {
    const newBook = new this.bookModel(createBookDto);
    return newBook.save();
  }

  async findAll(search: string) {
    const query = (typeof search === 'string' && search.trim() !== '')
      ? { title: { $regex: search, $options: 'i' } }
      : {};

    return this.bookModel.find(query).exec();
  }

  async findOne(id: string) {
    // 🚀 แก้ไข: ดักจับกรณีส่ง ID มั่วๆ มา จะได้ไม่ error 500
    if (!isValidObjectId(id)) {
      throw new BadRequestException('รหัสหนังสือไม่ถูกต้อง');
    }
    const book = await this.bookModel.findById(id).exec();
    if (!book) throw new NotFoundException('ไม่พบข้อมูลหนังสือ');
    return book;
  }

  async findByTitle(title: string) {
    if (typeof title !== 'string') {
      throw new BadRequestException('Title must be a string');
    }
    return this.bookModel.find({ title: { $regex: title, $options: 'i' } }).exec();
  }

  async remove(id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('รหัสหนังสือไม่ถูกต้อง');
    const result = await this.bookModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`ไม่พบหนังสือรหัส ${id} ในระบบ`);
    }

    return { message: 'ลบข้อมูลหนังสือเรียบร้อยแล้ว', deletedBook: result.title };
  }

  async update(id: string, updateBookDto: any) {
    if (!isValidObjectId(id)) throw new BadRequestException('รหัสหนังสือไม่ถูกต้อง');
    
    if (updateBookDto.stock) {
      const { total, available } = updateBookDto.stock;
      if (available > total) {
        throw new BadRequestException('จำนวนหนังสือพร้อมใช้งาน ห้ามมากกว่าสต็อกทั้งหมด');
      }
    }

    const updatedBook = await this.bookModel.findByIdAndUpdate(
      id,
      updateBookDto,
      { returnDocument: 'after' }
    ).exec();

    if (!updatedBook) {
      throw new NotFoundException(`ไม่พบหนังสือรหัส ${id} เพื่อทำการแก้ไข`);
    }

    return updatedBook;
  }
}