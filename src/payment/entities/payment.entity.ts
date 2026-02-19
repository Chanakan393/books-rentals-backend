import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true, versionKey: false })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'Rental', required: true })
  rentalId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ 
    default: 'verification', 
    enum: ['verification', 'paid', 'rejected', 'refunded'] 
  })
  status: string;

  @Prop()
  slipUrl: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);