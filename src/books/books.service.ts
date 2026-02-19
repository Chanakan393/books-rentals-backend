import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Book, BookDocument } from './entities/book.entity';
import { CreateBookDto } from './dto/create-book.dto';

@Injectable()
export class BooksService {
  constructor(@InjectModel(Book.name) private bookModel: Model<BookDocument>) { }

  // สร้างหนังสือ (สำหรับ Admin หรือ Mock Data)
  async create(createBookDto: CreateBookDto) {
    const newBook = new this.bookModel(createBookDto);
    return newBook.save();
  }

  // ค้นหาหนังสือ (Search)
  async findAll(search: string) {
    // ✅ ตรวจสอบว่าเป็น string และไม่ใช่ Object ว่าง
    const query = (typeof search === 'string' && search.trim() !== '')
      ? { title: { $regex: search, $options: 'i' } }
      : {};

    return this.bookModel.find(query).exec();
  }

  async findOne(id: string) {
    return this.bookModel.findById(id).exec();
  }

  async findByTitle(title: string) {
    if (typeof title !== 'string') {
      throw new BadRequestException('Title must be a string');
    }
    return this.bookModel.find({ title: { $regex: title, $options: 'i' } }).exec();
  }

  async remove(id: string) {
    // ค้นหาและลบหนังสือตาม ID
    const result = await this.bookModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`ไม่พบหนังสือรหัส ${id} ในระบบ`);
    }

    return { message: 'ลบข้อมูลหนังสือเรียบร้อยแล้ว', deletedBook: result.title };
  }

  async update(id: string, updateBookDto: any) {
    // ค้นหาด้วย ID และอัปเดตด้วยข้อมูลใหม่
    // { returnDocument: 'after' } เพื่อให้มันคืนค่าข้อมูลที่อัปเดตแล้วกลับมา (แก้ Warning ที่เคยเจอ)
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