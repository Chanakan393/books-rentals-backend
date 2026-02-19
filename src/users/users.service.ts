import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt'; // นำเข้า bcrypt
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
  const { email, username, password } = createUserDto;

  // 1. เช็คว่า Email ซ้ำไหม
  const emailExists = await this.userModel.findOne({ email });
  if (emailExists) {
    throw new BadRequestException('Email นี้ถูกใช้งานไปแล้ว');
  }

  // 2. เช็คเบอร์โทรศัพท์ซ้ำไหม
  const phoneExists = await this.userModel.findOne({ phoneNumber: createUserDto.phoneNumber });
  if (phoneExists) {
    throw new BadRequestException('เบอร์โทรศัพท์นี้ถูกใช้งานไปแล้ว');
  }

  // 3. Hash Password และบันทึก (ล็อก role เป็น member)
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new this.userModel({
    ...createUserDto,
    password: hashedPassword,
    role: 'member',
  });

  return newUser.save();
}

// ฟังก์ชันสำหรับหา User โดยเช็คทั้ง Username หรือ Email
async findByLogin(identifier: string): Promise<UserDocument | null> {
  return this.userModel.findOne({
    $or: [
      { email: identifier },
      { username: identifier }
    ]
  }).exec();
}

// ใช้ตอน Login และ Refresh
async findByIdWithRefresh(userId: string) {
    return this.userModel.findById(userId).select('+refreshTokenHash').exec();
}

// อัปเดต Hash กุญแจสำรอง
async setRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    return this.userModel.updateOne({ _id: userId }, { refreshTokenHash }).exec();
}

async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    
    // ⚠️ ข้อควรระวัง: ถ้ามีการแก้ Password ต้อง Hash ใหม่ด้วย
    if (updateUserDto.password) {
        const salt = await bcrypt.genSalt(10);
        updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }
    
    const updatedUser = await this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).exec();
    if (!updatedUser) {
        throw new BadRequestException('ไม่พบผู้ใช้งาน');
    }
    return updatedUser;
}

}