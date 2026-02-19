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
  ) {}

  // STEP 1: ลูกค้าแจ้งโอนเงิน
  async createPayment(rentalId: string, amount: number, slipUrl: string) {
    const payment = await this.paymentModel.create({ rentalId, amount, slipUrl });
    
    // อัปเดตสถานะที่ฝั่ง Rental ทันที
    await this.rentalModel.findByIdAndUpdate(rentalId, { 
      paymentStatus: 'verification' 
    });
    
    return payment;
  }

  // STEP 2: แอดมินดูรายการรอตรวจ
  async findAllPending() {
    return this.paymentModel.find({ status: 'verification' }).populate('rentalId').exec();
  }

  // STEP 2.1: แอดมินตรวจสอบสลิป
  async verifyPayment(paymentId: string, isApproved: boolean) {
    const status = isApproved ? 'paid' : 'rejected';
    const payment = await this.paymentModel.findByIdAndUpdate(paymentId, { status }, { new: true });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // อัปเดตสถานะที่ฝั่ง Rental ตามผลการตรวจ
    const rentalPaymentStatus = isApproved ? 'paid' : 'pending';
    await this.rentalModel.findByIdAndUpdate(payment.rentalId, { 
      paymentStatus: rentalPaymentStatus 
    });

    return payment;
  }
}