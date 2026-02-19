import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true, versionKey: false })
export class User {
  @Prop({ required: true }) 
  username: string;

  @Prop({ required: true, unique: true }) 
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true }) 
  phoneNumber: string;

  @Prop({ required: true }) 
  address: string;

  @Prop({ default: 'member', enum: ['member', 'admin'] })
  role: string;

  @Prop({ select: false })
  refreshTokenHash: string;
}

export const UserSchema = SchemaFactory.createForClass(User);