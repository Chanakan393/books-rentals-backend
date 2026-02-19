import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose'; // ✅ 1. เพิ่ม Types เข้ามา
import { Rental, RentalDocument } from './entities/rental.entity';
import { Book, BookDocument } from '../books/entities/book.entity';
import { Payment, PaymentDocument } from '../payment/entities/payment.entity';

@Injectable()
export class RentalsService {
  constructor(
    @InjectModel(Rental.name) private rentalModel: Model<RentalDocument>,
    @InjectModel(Book.name) private bookModel: Model<BookDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) { }

  // 1. ลูกค้ากดจองหนังสือ (booked)
  async rentBook(userId: string, bookId: string, days: number) {
    if (![3, 5, 7].includes(days)) {
      throw new BadRequestException('เลือกจำนวนวันเช่าได้แค่ 3, 5 หรือ 7 วันเท่านั้น');
    }

    const book = await this.bookModel.findOneAndUpdate(
      { _id: bookId, "stock.available": { $gt: 0 }, status: 'Available' },
      { $inc: { "stock.available": -1 } },
      { new: true }
    );

    if (!book) throw new BadRequestException('หนังสือหมด หรือไม่พร้อมให้เช่า');

    let rentalCost = days === 3 ? book.pricing.day3 : days === 5 ? book.pricing.day5 : book.pricing.day7;
    const dueDate = new Date();
    dueDate.setDate(new Date().getDate() + days);

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

  // 2. ลูกค้ามารับของ (booked -> rented)
  async pickupBook(rentalId: string) {
    const rental = await this.rentalModel.findById(rentalId);
    if (!rental) throw new NotFoundException('ไม่พบรายการเช่านี้');

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

  // 3. คืนหนังสือ (rented -> returned)
  async returnBook(rentalId: string) {
    const rental = await this.rentalModel.findById(rentalId);
    if (!rental || rental.status === 'returned') throw new BadRequestException('รายการไม่ถูกต้อง');

    await this.bookModel.findByIdAndUpdate(rental.bookId, { $inc: { "stock.available": 1 } });
    rental.status = 'returned';
    rental.returnDate = new Date();
    return rental.save();
  }

  async cancelRental(rentalId: string) {
    const rental = await this.rentalModel.findById(rentalId);
    if (!rental) throw new NotFoundException('ไม่พบรายการเช่า');

    if (rental.status !== 'booked') {
      throw new BadRequestException('สามารถยกเลิกได้เฉพาะรายการที่ยังไม่ได้มารับหนังสือเท่านั้น');
    }

    // 🔥 FIX: กำหนดสถานะเป้าหมายรอไว้ก่อน
    let targetPaymentStatus = '';     // สถานะที่จะแก้ใน Payment (refunded / rejected)
    let targetRentalPaymentStatus = ''; // สถานะที่จะแก้ใน Rental (refund_pending / cancelled)

    if (['paid', 'verification'].includes(rental.paymentStatus)) {
      targetPaymentStatus = 'refunded';
      targetRentalPaymentStatus = 'refund_pending';
    } else {
      targetPaymentStatus = 'rejected'; // หรือ cancelled ถ้าคุณมี enum นี้
      targetRentalPaymentStatus = 'cancelled';
    }

    // 🔥 FIX: ยิงอัปเดต 2 ครั้ง (ดักจับทุกรูปแบบ ID)
    // รอบที่ 1: หาด้วย ObjectId (แบบมาตรฐาน)
    let updateResult = await this.paymentModel.findOneAndUpdate(
      { rentalId: rental._id },
      { status: targetPaymentStatus },
      { new: true }
    );

    // รอบที่ 2: ถ้าไม่เจอ... หาด้วย String (เผื่อข้อมูลเก่าเก็บเป็นตัวหนังสือ)
    if (!updateResult) {
      console.log('⚠️ รอบแรกไม่เจอ กำลังลองหาแบบ String...');
      updateResult = await this.paymentModel.findOneAndUpdate(
        { rentalId: rental._id.toString() },
        { status: targetPaymentStatus },
        { new: true }
      );
    }

    console.log('✅ ผลสรุปการอัปเดต Payment:', updateResult ? 'สำเร็จ (เปลี่ยนเป็น ' + targetPaymentStatus + ')' : 'ไม่พบข้อมูล Payment ในระบบ');

    // อัปเดตฝั่ง Rental
    rental.paymentStatus = targetRentalPaymentStatus;
    rental.status = 'cancelled';

    // คืนสต็อกหนังสือ
    await this.bookModel.findByIdAndUpdate(rental.bookId, {
      $inc: { "stock.available": 1 }
    });

    return rental.save();
  }

  async findMyHistory(userId: string) {
    return this.rentalModel.find({ userId }).populate('userId', 'username email').populate('bookId', 'title').sort({ createdAt: -1 }).exec();
  }
}