import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type RentalDocument = Rental & Document;

@Schema({ timestamps: true, versionKey: false })
export class Rental {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Book', required: true })
  bookId: string;

  @Prop({ required: true })
  borrowDate: Date;

  @Prop({ required: true })
  dueDate: Date;

  @Prop()
  returnDate: Date;

  @Prop({ required: true })
  cost: number;

  @Prop({ default: 0 })
  fine: number;

  // ✅ ใช้เวอร์ชันนี้เวอร์ชันเดียว (ลบอันเก่าทิ้ง)
  @Prop({
    default: 'booked',
    enum: ['booked', 'rented', 'returned', 'cancelled']
  })
  status: string;

  @Prop({
    default: 'pending',
    enum: ['pending', 'verification', 'paid', 'refund_pending', 'refunded', 'cancelled']
  })
  paymentStatus: string;
}

export const RentalSchema = SchemaFactory.createForClass(Rental);