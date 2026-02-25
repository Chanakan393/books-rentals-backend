import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Rental, RentalDocument } from './entities/rental.entity';
import { Book, BookDocument } from '../books/entities/book.entity';
import { Payment, PaymentDocument } from '../payment/entities/payment.entity';

@Injectable()
export class RentalsService {
  findOverdueRentals() {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectModel(Rental.name) private rentalModel: Model<RentalDocument>,
    @InjectModel(Book.name) private bookModel: Model<BookDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) { }

  // ระบบจัดการเมื่อลูกค้ากดเช่าหนังสือ
  async rentBook(userId: string, bookId: string, days: number) {
    if (!isValidObjectId(bookId)) throw new BadRequestException('รหัสหนังสือไม่ถูกต้อง');

    if (![3, 5, 7].includes(days)) {
      throw new BadRequestException('เลือกจำนวนวันเช่าได้แค่ 3, 5 หรือ 7 วันเท่านั้น');
    }

    // ดักจับ Overdue
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)); // รีเซ็ตเวลาเป็น 00:00 ของวันนี้

    // เช็คว่ามีหนังสือที่ "ค้างคืน" อยู่ไหม (ถ้ามี ห้ามยืมเล่มใหม่)
    const overdueCount = await this.rentalModel.countDocuments({
      userId: userId,
      status: 'rented',
      dueDate: { $lt: todayStart } // ถ้าวันกำหนดคืน น้อยกว่า วันนี้ (00:00 น.) = ค้างคืน
    });

    if (overdueCount > 0) {
      throw new BadRequestException('ไม่สามารถทำรายการได้! คุณมีหนังสือที่เกินกำหนดคืน กรุณานำมาคืนและชำระค่าปรับก่อนทำการเช่าเล่มใหม่ครับ');
    }

    // ตัดสต็อกทันที
    const book = await this.bookModel.findOneAndUpdate(
      { _id: bookId, "stock.available": { $gt: 0 }, status: 'Available' },
      { $inc: { "stock.available": -1 } },
      { new: true }
    );

    if (!book) throw new BadRequestException('หนังสือหมด หรือไม่พร้อมให้เช่า');

    let rentalCost = days === 3 ? book.pricing.day3 : days === 5 ? book.pricing.day5 : book.pricing.day7;

    // ตั้งค่าวันกำหนดคืน
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    dueDate.setHours(23, 59, 59, 999); // ให้สิทธิ์คืนได้ถึงวินาทีสุดท้ายของวันนั้น

    const rental = new this.rentalModel({
      userId,
      bookId,
      borrowDate: new Date(),
      dueDate,
      cost: rentalCost,
      status: 'booked',
      paymentStatus: 'pending'
    });

    return rental.save();
  }

  // ลูกค้ามารับของที่ร้าน
  async pickupBook(rentalId: string) {
    if (!isValidObjectId(rentalId)) throw new BadRequestException('รหัสรายการเช่าไม่ถูกต้อง');
    const rental = await this.rentalModel.findById(rentalId);
    if (!rental) throw new NotFoundException('ไม่พบรายการเช่านี้');

    // ตรวจสลิปผ่านแล้วถึงจะให้รับของได้
    if (rental.paymentStatus !== 'paid') {
      throw new BadRequestException('ยังไม่ได้จ่ายเงินหรือรอแอดมินตรวจสอบสลิป');
    }

    if (rental.status !== 'booked') {
      throw new BadRequestException('สถานะไม่ถูกต้องสำหรับการรับหนังสือ');
    }

    rental.status = 'rented';
    rental.borrowDate = new Date();
    return rental.save();
  }

  // ลูกค้านำหนังสือมาคืน
  async returnBook(rentalId: string) {
    if (!isValidObjectId(rentalId)) throw new BadRequestException('รหัสรายการเช่าไม่ถูกต้อง');
    const rental = await this.rentalModel.findById(rentalId);
    if (!rental || rental.status !== 'rented') {
      throw new BadRequestException('รายการไม่ถูกต้อง หรือหนังสือไม่ได้อยู่ในสถานะกำลังเช่า');
    }

    const now = new Date();
    // เปรียบเทียบแค่วันที่ (ไม่สนเวลา)
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const dueDateStart = new Date(new Date(rental.dueDate).setHours(0, 0, 0, 0));

    let fine = 0;

    if (todayStart > dueDateStart) {
      const diffTime = Math.abs(todayStart.getTime() - dueDateStart.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // คำนวณว่าเลยมาแล้วกี่วัน
      fine = diffDays * 100; 
    }

    const book = await this.bookModel.findById(rental.bookId);
    if (book) {
      const newAvailable = Math.min(book.stock.available + 1, book.stock.total);
      await this.bookModel.findByIdAndUpdate(rental.bookId, { "stock.available": newAvailable });
    }

    rental.status = 'returned';
    rental.returnDate = new Date();
    rental.fine = fine;

    return rental.save();
  }

  // ลูกค้ายกเลิกการจอง
  async cancelRental(rentalId: string, currentUserId: string) {
    if (!isValidObjectId(rentalId)) throw new BadRequestException('รหัสรายการเช่าไม่ถูกต้อง');

    const rental = await this.rentalModel.findById(rentalId);
    if (!rental) throw new NotFoundException('ไม่พบรายการเช่า');

    if (rental.userId.toString() !== currentUserId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ยกเลิกรายการเช่าของผู้อื่น');
    }

    // การคืนเงิน
    if (rental.paymentStatus !== 'pending' && rental.paymentStatus !== 'cancelled') {
      rental.paymentStatus = 'refund_verification';
      // เข้าไปอัปเดตในฝั่ง Payment ด้วย
      await this.paymentModel.findOneAndUpdate(
        { rentalId: rental._id.toString() },
        { $set: { status: 'refund_verification' } }
      ).exec();
    } else {
      rental.paymentStatus = 'cancelled';
    }

    rental.status = 'cancelled';

    const book = await this.bookModel.findById(rental.bookId);
    if (book) {
      const newAvailable = Math.min(book.stock.available + 1, book.stock.total);
      await this.bookModel.findByIdAndUpdate(rental.bookId, { "stock.available": newAvailable });
    }

    return rental.save();
  }

  async findMyHistory(userId: string) {
    return this.rentalModel.find({ userId })
      .populate('userId', 'username email phoneNumber address')
      .populate('bookId', 'title coverImage')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Dashboard สรุปยอดเช่าและรายได้ (สำหรับ Admin)
  async getDashboardReports(dateString?: string) {
    let query: any = {};
    if (dateString && dateString !== 'all') {
      const targetDate = new Date(dateString);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      query = { createdAt: { $gte: startOfDay, $lte: endOfDay } };
    }

    const transactions = await this.rentalModel.find(query)
      .populate('userId', 'username email')
      .populate('bookId', 'title coverImage')
      .sort({ createdAt: -1 })
      .exec();

    const activeBookings = await this.rentalModel.countDocuments({ ...query, status: 'booked' });
    const activeRentals = await this.rentalModel.countDocuments({ ...query, status: 'rented' });

    // เช็ค Overdue
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const overdueRentals = await this.rentalModel.countDocuments({
      ...query,
      status: 'rented',
      dueDate: { $lt: todayStart }
    });

    // คำนวณรายได้: รวมยอดเฉพาะรายการที่ "จ่ายแล้ว" (paid) และ "ไม่ถูกยกเลิก"
    const revenue = transactions
      .filter(r => r.paymentStatus === 'paid' && r.status !== 'cancelled')
      .reduce((sum, r) => sum + r.cost, 0);

    return {
      summaryData: { activeBookings, activeRentals, overdueRentals, revenue },
      transactions
    };
  }
}