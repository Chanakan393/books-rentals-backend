import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BookDocument = Book & Document;

// สร้าง Class ย่อยสำหรับ Stock และ Pricing (เพื่อให้รองรับ Nested Object)
class Stock {
  @Prop() total: number;
  @Prop() available: number;
}

class Pricing {
  @Prop() day3: number;
  @Prop() day5: number;
  @Prop() day7: number;
}

@Schema({ timestamps: true, versionKey: false})
export class Book {
  @Prop({ required: true })
  title: string;

  @Prop()
  author: string;

  @Prop()
  category: string;

  @Prop()
  description: string;

  @Prop()
  coverImage: string;

  // ✅ จุดสำคัญ: ใช้ Class ย่อยที่ประกาศไว้ด้านบน
  @Prop({ type: Stock, _id: false })
  stock: Stock;

  @Prop({ type: Pricing, _id: false })
  pricing: Pricing;

  @Prop({ default: 'Available' })
  status: string;
}

export const BookSchema = SchemaFactory.createForClass(Book);