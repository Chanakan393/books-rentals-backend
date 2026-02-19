import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'; // 1. ต้อง Import อันนี้
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './entities/user.entity'; // 2. Import User Model มาใช้

@Module({
  imports: [
    // 3. หัวใจสำคัญ: ต้องบอก Module ว่า "ฉันมี User Model นะ!"
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // 4. Export ไว้ด้วย เดี๋ยว AuthModule ต้องมาขอยืมใช้
})
export class UsersModule {}