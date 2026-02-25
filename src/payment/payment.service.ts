import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './entities/payment.entity';
import { Rental, RentalDocument } from '../rentals/entities/rental.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Rental.name) private rentalModel: Model<RentalDocument>,
  ) { }

  // บันทึกการชำระเงินใหม่และเปลี่ยนสถานะการเช่า
  async createPayment(rentalId: string, amount: number, slipUrl: string) {

    const payment = await this.paymentModel.create({ rentalId, amount, slipUrl });
    
    await this.rentalModel.findByIdAndUpdate(rentalId, {
      paymentStatus: 'verification'
    });
    return payment;
  }

  // ค้นหารายการที่ต้องตรวจสอบ (รองรับการกรองตามวันที่)
  async findAllPending(dateString?: string) {
    let query: any = {};

    if (dateString) {
      // ครอบคลุมตั้งแต่ 00:00:00 ถึง 23:59:59 ของวันนั้น
      const targetDate = new Date(dateString);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      query = {
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['verification', 'paid', 'rejected', 'refunded', 'refund_rejected', 'refund_verification'] }
      };
    } else {

      query = { status: { $in: ['verification', 'refund_verification'] } };
    }

    return this.paymentModel.find(query)
      .populate({
        path: 'rentalId',
        populate: [
          { path: 'userId', select: 'username' },
          { path: 'bookId', select: 'title' }
        ]
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // ระบบตัดสินใจเมื่อแอดมินกด อนุมัติ/ไม่อนุมัติ]
  async verifyPayment(paymentId: string, isApproved: boolean) {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) throw new NotFoundException('Payment not found');

    const rental = await this.rentalModel.findById(payment.rentalId);
    if (!rental) throw new NotFoundException('Rental not found');

    // แยกลอจิกการทำงานระหว่าง "ตรวจสลิปโอนเงินปกติ" กับ "ตรวจสลิปโอนคืนเงิน"
    if (rental.paymentStatus === 'refund_verification') {

      // กรณีคืนเงิน
      rental.paymentStatus = isApproved ? 'refunded' : 'refund_rejected';
      payment.status = isApproved ? 'refunded' : 'refund_rejected'; 
    } 
    else {
      // กรณีจ่ายเงินเช่าปกติ
      payment.status = isApproved ? 'paid' : 'rejected';
      rental.paymentStatus = isApproved ? 'paid' : 'pending'; 
    }

    await rental.save();
    return payment.save();
  }
}