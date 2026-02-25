import { Controller, Post, Body, Patch, UseGuards, Param, Get, Req, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('Users (ระบบสมาชิก)')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // ==========================================
  // โซน Public & Member
  // ==========================================

  @ApiOperation({ summary: 'สมัครสมาชิกใหม่' })
  @Post('register')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูข้อมูลโปรไฟล์ตัวเอง' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyProfile(@Req() req) {
    return this.usersService.findById(req.user.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'แก้ไขข้อมูลโปรไฟล์ (เฉพาะเจ้าของ)' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req) {
    if (id !== req.user.userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขข้อมูลผู้อื่น');
    }
    return this.usersService.update(id, updateUserDto);
  }

  // ==========================================
  // 🔴 โซน Admin Only (ดูได้อย่างเดียว)
  // ==========================================

  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูรายชื่อลูกค้าทั้งหมด (Admin Only)' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดูข้อมูลลูกค้ารายบุคคล (Admin Only)' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}