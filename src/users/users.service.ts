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

  private validateAndCleanPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return '';

    // ลบขีด (-) หรือช่องว่างออกให้หมดก่อนเช็ค
    const cleanPhone = phoneNumber.replace(/[- ]/g, '');
    const phoneRegex = /^(06|08|09)\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      throw new BadRequestException('เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องขึ้นด้วย 06, 08, 09 และมี 10 หลักเท่านั้น)');
    }

    return cleanPhone;
  }

  // ตรวจสอบอักษรพิเศษในที่อยู่ รองรับภาษาไทยและอนุญาตให้พิมพ์แค่ / กับช่องว่าง
  private validateAddress(address: string) {
    if (address.trim().length < 10) {
      throw new BadRequestException('ที่อยู่ต้องมีความยาวอย่างน้อย 10 ตัวอักษร');
    }

    const addressRegex = /^[a-zA-Z0-9ก-๛\s/]+$/;
    if (!addressRegex.test(address)) {
      throw new BadRequestException('ที่อยู่ห้ามมีอักษรพิเศษ (อนุญาตเฉพาะ / และช่องว่างเท่านั้น)');
    }
  }

  // ตรวจสอบรหัสไปรษณีย์
  private validateZipcode(zipcode: string) {
    const zipRegex = /^\d{5}$/;
    if (!zipRegex.test(zipcode)) {
      throw new BadRequestException('รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลักเท่านั้น');
    }
  }

  // เช็คข้อมูลทั้งหมดก่อนบันทึก
  private validateStringLengths(data: any) {
    if (data.username !== undefined) {
      const trimmedUsername = data.username.trim();

      if (typeof data.username !== 'string' || trimmedUsername.length < 1 || trimmedUsername.length > 20) {
        throw new BadRequestException('ชื่อผู้ใช้งานต้องมีความยาว 1-20 ตัวอักษร');
      }

      const usernameRegex = /^[a-zA-Z0-9ก-๛]+$/;
      if (!usernameRegex.test(trimmedUsername)) {
        throw new BadRequestException('ชื่อผู้ใช้งานห้ามมีอักษรพิเศษหรือช่องว่าง');
      }

      if (/^\d+$/.test(trimmedUsername)) {
        throw new BadRequestException('ชื่อผู้ใช้งานไม่สามารถเป็นตัวเลขล้วนได้');
      }
    }

    if (data.password !== undefined) {
      if (typeof data.password !== 'string' || data.password.length < 8 || data.password.length > 20) {
        throw new BadRequestException('รหัสผ่านต้องเป็นข้อความและมีความยาวระหว่าง 8 ถึง 20 ตัวอักษร');
      }
    }

    if (data.address !== undefined) {
      this.validateAddress(data.address);
    }

    if (data.zipcode !== undefined) {
      this.validateZipcode(data.zipcode);
    }
  }

  // สร้างบัญชีผู้ใช้งานใหม่ (Register)
  async create(createUserDto: CreateUserDto): Promise<User> {
    let { email, password, username } = createUserDto;

    // ตรวจสอบความถูกต้อง
    this.validateStringLengths(createUserDto);

    // แปลง Email และ Username เป็นตัวพิมพ์เล็กหมด
    email = email.toLowerCase().trim();
    username = username.toLowerCase().trim();

    createUserDto.email = email;
    createUserDto.username = username;

    const usernameExists = await this.userModel.findOne({ username });
    if (usernameExists) {
      throw new BadRequestException('ชื่อผู้ใช้งาน (Username) นี้ถูกใช้งานไปแล้ว');
    }

    const emailExists = await this.userModel.findOne({ email });
    if (emailExists) {
      throw new BadRequestException('Email นี้ถูกใช้งานไปแล้ว');
    }

    if (createUserDto.phoneNumber) {
      createUserDto.phoneNumber = this.validateAndCleanPhoneNumber(createUserDto.phoneNumber);
      const phoneExists = await this.userModel.findOne({ phoneNumber: createUserDto.phoneNumber });
      if (phoneExists) {
        throw new BadRequestException('เบอร์โทรศัพท์นี้ถูกใช้งานไปแล้ว');
      }
    }

    // เข้ารหัส (Hash) รหัสผ่านก่อนลง Database เสมอ
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      role: 'member',
    });

    return newUser.save();
  }

  // อัปเดตข้อมูลผู้ใช้
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('ไม่พบข้อมูลผู้ใช้งาน');

    // ตรวจสอบความถูกต้องของข้อมูล
    this.validateStringLengths(updateUserDto);

    if (updateUserDto.username) {
      const lowerUsername = updateUserDto.username.toLowerCase().trim();
      if (lowerUsername !== user.username) {
        const usernameExists = await this.userModel.findOne({ username: lowerUsername });
        if (usernameExists) throw new BadRequestException('ชื่อผู้ใช้งานนี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว');
        updateUserDto.username = lowerUsername;
      }
    }

    if (updateUserDto.email) {
      const lowerEmail = updateUserDto.email.toLowerCase().trim();
      if (lowerEmail !== user.email) {
        const emailExists = await this.userModel.findOne({ email: lowerEmail });
        if (emailExists) throw new BadRequestException('Email นี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว');
        updateUserDto.email = lowerEmail;
      }
    }

    if (updateUserDto.phoneNumber) {
      updateUserDto.phoneNumber = this.validateAndCleanPhoneNumber(updateUserDto.phoneNumber);
      if (updateUserDto.phoneNumber !== user.phoneNumber) {
        const phoneExists = await this.userModel.findOne({ phoneNumber: updateUserDto.phoneNumber });
        if (phoneExists) throw new BadRequestException('เบอร์โทรศัพท์นี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว');
      }
    }

    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt(10);
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, { $set: updateUserDto }, { new: true })
      .select('-password -refreshTokenHash')
      .exec();

    if (!updatedUser) throw new NotFoundException('ไม่พบข้อมูลผู้ใช้งาน');
    return updatedUser;
  }

  async findByLogin(identifier: string): Promise<UserDocument | null> {
    const lowerIdentifier = identifier.toLowerCase().trim();
    return this.userModel.findOne({
      $or: [{ email: lowerIdentifier }, { username: lowerIdentifier }]
    }).exec();
  }

  async findByIdWithRefresh(userId: string) {
    return this.userModel.findById(userId).select('+refreshTokenHash').exec();
  }

  async setRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    return this.userModel.updateOne({ _id: userId }, { refreshTokenHash }).exec();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel
      .find({ role: 'member' })
      .select('-password -refreshTokenHash')
      .exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(id)
      .select('-password -refreshTokenHash')
      .exec();
    if (!user) throw new BadRequestException('ไม่พบข้อมูลผู้ใช้งาน');
    return user;
  }
}