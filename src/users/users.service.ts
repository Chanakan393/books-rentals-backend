import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

  // 🛡️ 1. ฟังก์ชันช่วยตรวจสอบและล้างค่าเบอร์โทรศัพท์
  private validateAndCleanPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return '';
    
    // ล้างช่องว่างและขีดออกให้เหลือแต่ตัวเลข
    const cleanPhone = phoneNumber.replace(/[- ]/g, '');

    // เช็ค Regex: ขึ้นด้วย 06, 08, 09 และต้องครบ 10 หลัก
    const phoneRegex = /^(06|08|09)\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      throw new BadRequestException('เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องขึ้นด้วย 06, 08, 09 และมี 10 หลักเท่านั้น)');
    }
    
    return cleanPhone;
  }

  // 🛡️ 2. ฟังก์ชันดักจับความยาวข้อมูลชั้นที่ 2 (Double Check) ป้องกันการยิง API ข้าม DTO
  private validateStringLengths(data: any) {
    if (data.username !== undefined) {
      if (data.username.trim().length < 1 || data.username.trim().length > 20) {
        throw new BadRequestException('ชื่อผู้ใช้งานต้องมีความยาว 1-20 ตัวอักษร');
      }
    }
    // รหัสผ่าน ไม่ควร trim() เพราะสเปซบาร์ก็นับเป็นรหัสผ่านได้
    if (data.password !== undefined) {
      if (data.password.length < 8 || data.password.length > 20) {
        throw new BadRequestException('รหัสผ่านต้องมีความยาวระหว่าง 8 ถึง 20 ตัวอักษร');
      }
    }
    if (data.address !== undefined) {
      if (data.address.trim().length < 10) {
        throw new BadRequestException('ที่อยู่ต้องมีความยาวอย่างน้อย 10 ตัวอักษร');
      }
    }
  }

  // ==========================================
  //  ฟังก์ชันการทำงานหลัก (CRUD)
  // ==========================================

  async create(createUserDto: CreateUserDto): Promise<User> {
    let { email, password } = createUserDto;

    // 🚀 ดักจับความยาวข้อมูลก่อนทำอย่างอื่น (Double Validation)
    this.validateStringLengths(createUserDto);

    // 🚀 แปลง Email เป็นพิมพ์เล็กและตัดช่องว่าง ป้องกันการสมัครซ้ำแบบ Case-Sensitive
    email = email.toLowerCase().trim();
    createUserDto.email = email;

    // 🚀 ตรวจสอบและล้างค่าเบอร์โทรศัพท์
    if (createUserDto.phoneNumber) {
      createUserDto.phoneNumber = this.validateAndCleanPhoneNumber(createUserDto.phoneNumber);
    }

    // เช็คว่า Email ซ้ำไหม
    const emailExists = await this.userModel.findOne({ email });
    if (emailExists) {
      throw new BadRequestException('Email นี้ถูกใช้งานไปแล้ว');
    }

    // เช็คเบอร์โทรศัพท์ซ้ำไหม
    if (createUserDto.phoneNumber) {
      const phoneExists = await this.userModel.findOne({ phoneNumber: createUserDto.phoneNumber });
      if (phoneExists) {
        throw new BadRequestException('เบอร์โทรศัพท์นี้ถูกใช้งานไปแล้ว');
      }
    }

    // Hash Password และบันทึก (ล็อก role เป็น member)
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
    const lowerIdentifier = identifier.toLowerCase().trim();
    
    return this.userModel.findOne({
      $or: [
        { email: lowerIdentifier },
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

  // แก้ไขข้อมูลผู้ใช้งาน
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('ไม่พบข้อมูลผู้ใช้งาน');

    // 🚀 ดักจับความยาวข้อมูลก่อนทำอย่างอื่น (Double Validation)
    this.validateStringLengths(updateUserDto);

    // ตรวจสอบและแปลง Email เป็นพิมพ์เล็กก่อนบันทึก
    if (updateUserDto.email) {
      updateUserDto.email = updateUserDto.email.toLowerCase().trim();
      if (updateUserDto.email !== user.email) {
        const emailExists = await this.userModel.findOne({ email: updateUserDto.email });
        if (emailExists) throw new BadRequestException('Email นี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว');
      }
    }

    // ตรวจสอบและล้างค่าเบอร์โทรศัพท์
    if (updateUserDto.phoneNumber) {
      updateUserDto.phoneNumber = this.validateAndCleanPhoneNumber(updateUserDto.phoneNumber);
      if (updateUserDto.phoneNumber !== user.phoneNumber) {
        const phoneExists = await this.userModel.findOne({ phoneNumber: updateUserDto.phoneNumber });
        if (phoneExists) throw new BadRequestException('เบอร์โทรศัพท์นี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว');
      }
    }

    // ถ้ามีการแก้ Password ต้อง Hash ใหม่
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt(10);
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, { $set: updateUserDto }, { new: true })
      .select('-password -refreshTokenHash') // 🔒 ไม่ส่งข้อมูลลับกลับไป
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('ไม่พบข้อมูลผู้ใช้งาน');
    }
    return updatedUser;
  }

  // ==========================================
  //  ฟังก์ชันสำหรับ Admin และ Profile
  // ==========================================

  // ดึงรายชื่อสมาชิกทั้งหมด (ไม่เอา Password และ Hash) - สำหรับแอดมิน
  async findAll(): Promise<UserDocument[]> {
    return this.userModel
      .find({ role: 'member' })
      .select('-password -refreshTokenHash')
      .exec();
  }

  // ดูข้อมูลลูกค้ารายบุคคล - สำหรับแอดมิน และ Member ดูหน้าโปรไฟล์ตัวเอง
  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(id)
      .select('-password -refreshTokenHash')
      .exec();

    if (!user) throw new BadRequestException('ไม่พบข้อมูลผู้ใช้งาน');
    return user;
  }
}