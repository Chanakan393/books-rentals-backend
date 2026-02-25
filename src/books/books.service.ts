import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Book, BookDocument } from './entities/book.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { RentalDocument, Rental } from '../rentals/entities/rental.entity';

@Injectable()
export class BooksService {
  constructor(
    @InjectModel(Book.name) private bookModel: Model<BookDocument>,
    @InjectModel(Rental.name) private rentalModel: Model<RentalDocument> // 🎯 ดึง Rental มาใช้เช็คว่าหนังสือโดนยืมอยู่ไหม
  ) { }

  // ตรวจสอบความถูกต้องของข้อมูลหนังสือก่อนบันทึก]
  private validateBookNumbers(data: any) {
    // เช็คสต็อก: ต้องเป็นตัวเลขจำนวนเต็ม ห้ามติดลบ
    if (data.stock) {
      if (data.stock.total !== undefined) {
        if (!Number.isInteger(data.stock.total)) throw new BadRequestException('สต็อกทั้งหมดต้องเป็นจำนวนเต็มเท่านั้น');
        if (data.stock.total <= 0) throw new BadRequestException('สต็อกทั้งหมดต้องมีอย่างน้อย 1 เล่ม');
      }
      if (data.stock.available !== undefined) {
        if (!Number.isInteger(data.stock.available)) throw new BadRequestException('จำนวนหนังสือพร้อมใช้งานต้องเป็นจำนวนเต็มเท่านั้น');
        if (data.stock.available < 0) throw new BadRequestException('จำนวนหนังสือพร้อมใช้งานต้องไม่ติดลบ');
      }
    }

    // เช็คราคากับทศนิยม (ไม่เกิน 2 ตำแหน่ง)
    if (data.pricing) {
      const p = data.pricing;

      // ฟังก์ชันเช็คทศนิยมไม่เกิน 2 ตำแหน่ง
      const checkDecimal = (val: number, fieldName: string) => {
        if (val !== undefined) {
          if (val <= 0) throw new BadRequestException(`ราคาเช่า ${fieldName} ต้องมากกว่า 0 บาท`);
          // คูณ 100 ถ้ายังมีเศษเหลือ แสดงว่าทศนิยมเกิน 2 ตำแหน่ง
          if ((val * 100) % 1 !== 0) {
            throw new BadRequestException(`ราคาเช่า ${fieldName} ต้องมีทศนิยมไม่เกิน 2 ตำแหน่ง`);
          }
        }
      };

      checkDecimal(p.day3, '3 วัน');
      checkDecimal(p.day5, '5 วัน');
      checkDecimal(p.day7, '7 วัน');

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
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'ทั้งหมด') {
      query.category = category;
    }

    // ค้นหาแล้วจัดเรียงตามวันที่อัปเดตล่าสุด (เล่มใหม่สุดอยู่บน)
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

    // ป้องกัน Admin ลดสต็อกมั่วซั่ว ถ้ามีลูกค้าจอง/เช่าอยู่
    if (updateBookDto.stock) {
      const book = await this.bookModel.findById(id);
      if (book) {
        const newTotal = updateBookDto.stock.total !== undefined ? updateBookDto.stock.total : book.stock.total;
        const newAvailable = updateBookDto.stock.available !== undefined ? updateBookDto.stock.available : book.stock.available;

        // นับจำนวนที่โดนเช่าหรือจองอยู่
        const activeRentalsCount = await this.rentalModel.countDocuments({
          bookId: id,
          status: { $in: ['booked', 'rented'] }
        });

        const maxPossibleAvailable = newTotal - activeRentalsCount;

        if (newAvailable > maxPossibleAvailable) {
          throw new BadRequestException(`ข้อมูลสต็อกขัดแย้งกัน! มีลูกค้าเช่า/จองอยู่ ${activeRentalsCount} เล่ม...`);
        }
      }
    }

    const updatedBook = await this.bookModel.findByIdAndUpdate(id, updateBookDto, { new: true }).exec();

    if (!updatedBook) throw new NotFoundException(`ไม่พบหนังสือรหัส ${id} เพื่อทำการแก้ไข`);

    return updatedBook;
  }
}