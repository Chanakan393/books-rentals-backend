import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Book, BookDocument } from './entities/book.entity';
import { CreateBookDto } from './dto/create-book.dto';
// 🚀 1. Import RentalDocument เข้ามาเพื่อใช้กำหนด Type
import { RentalDocument, Rental } from '../rentals/entities/rental.entity';

@Injectable()
export class BooksService {
  constructor(
    @InjectModel(Book.name) private bookModel: Model<BookDocument>,
    @InjectModel(Rental.name) private rentalModel: Model<RentalDocument>
  ) { }

  private validateBookNumbers(data: any) {
    if (data.stock) {
      if (data.stock.total !== undefined && data.stock.total <= 0) {
        throw new BadRequestException('สต็อกทั้งหมดต้องมีอย่างน้อย 1 เล่ม');
      }
      if (data.stock.available !== undefined && data.stock.available < 0) {
        throw new BadRequestException('จำนวนหนังสือพร้อมใช้งานต้องไม่ติดลบ');
      }
    }

    if (data.pricing) {
      const p = data.pricing;
      if (p.day3 !== undefined && p.day3 <= 0) throw new BadRequestException('ราคาเช่า 3 วันต้องมากกว่า 0 บาท');
      if (p.day5 !== undefined && p.day5 <= 0) throw new BadRequestException('ราคาเช่า 5 วันต้องมากกว่า 0 บาท');
      if (p.day7 !== undefined && p.day7 <= 0) throw new BadRequestException('ราคาเช่า 7 วันต้องมากกว่า 0 บาท');

      if (p.day3 !== undefined && p.day5 !== undefined && p.day7 !== undefined) {
        if (p.day3 >= p.day5 || p.day5 >= p.day7) {
          throw new BadRequestException('ราคาเช่าต้องสมเหตุสมผล: 3 วัน < 5 วัน < 7 วัน');
        }
      }
    }
  }

  async create(createBookDto: CreateBookDto) {
    this.validateBookNumbers(createBookDto);
    const newBook = new this.bookModel(createBookDto);
    return newBook.save();
  }

  async findAll(search?: string, category?: string) {
    let query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        // 🚀 เพิ่มให้ค้นหาจากหมวดหมู่ในช่อง search หลักได้ด้วย
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'ทั้งหมด') {
      // 🚀 ใช้ $regex แทนการเทียบค่าตรงๆ เพื่อให้หา "มังงะ" ใน "มังงะ (Manga)" เจอ
      query.category = category;
    }

    return this.bookModel.find(query).sort({ updatedAt: -1 }).exec();
  }

  async findOne(id: string) {
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

    this.validateBookNumbers(updateBookDto);

    if (updateBookDto.stock) {
      const book = await this.bookModel.findById(id);
      if (book) {
        const newTotal = updateBookDto.stock.total !== undefined ? updateBookDto.stock.total : book.stock.total;
        const newAvailable = updateBookDto.stock.available !== undefined ? updateBookDto.stock.available : book.stock.available;

        const activeRentalsCount = await this.rentalModel.countDocuments({
          bookId: id,
          status: { $in: ['booked', 'rented'] }
        });

        const maxPossibleAvailable = newTotal - activeRentalsCount;

        if (newAvailable > maxPossibleAvailable) {
          throw new BadRequestException(`ข้อมูลสต็อกขัดแย้งกัน! มีลูกค้าเช่า/จองอยู่ ${activeRentalsCount} เล่ม (กำหนด 'พร้อมใช้งาน' ได้สูงสุดแค่ ${maxPossibleAvailable} เล่ม)`);
        }
      }
    }

    // 🚀 อัปเดตข้อมูลและส่งค่าใหม่กลับไป
    const updatedBook = await this.bookModel.findByIdAndUpdate(
      id,
      updateBookDto,
      { new: true } // ให้ผลลัพธ์ที่ได้เป็นค่าที่อัปเดตแล้ว
    ).exec();

    if (!updatedBook) {
      throw new NotFoundException(`ไม่พบหนังสือรหัส ${id} เพื่อทำการแก้ไข`);
    }

    return updatedBook;
  }
}