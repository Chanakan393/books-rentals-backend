import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { BooksService } from './books.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdateBookDto } from './dto/update-book.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('Books (ระบบจัดการหนังสือ)')
@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly cloudinaryService: CloudinaryService
  ) { }

  // ==========================================
  // โซน Public ใครก็ดึงข้อมูลหนังสือไปดูได้
  // ==========================================

  @ApiOperation({ summary: 'ดึงข้อมูลหนังสือทั้งหมด (ค้นหา/กรองหมวดหมู่ได้)' })
  @Get()
  findAll(
    @Query('search') search: string,
    @Query('category') category: string 
  ) {
    return this.booksService.findAll(search, category);
  }

  @ApiOperation({ summary: 'ดูรายละเอียดหนังสือรายเล่ม' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  // ==========================================
  // โซน Admin Only สำหรับจัดการหนังสือ
  // ==========================================

  @ApiBearerAuth()
  @ApiOperation({ summary: 'เพิ่มหนังสือใหม่ (Admin Only)' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() createBookDto: any) {
    return this.booksService.create(createBookDto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'แก้ไขข้อมูลหนังสือ (Admin Only)' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto
  ) {
    return this.booksService.update(id, updateBookDto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'ลบหนังสือ (Admin Only)' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.booksService.remove(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'อัปโหลดรูปปกหนังสือขึ้น Cloudinary' })
  @Post('upload-cover')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(
    @UploadedFile(
      // เช็คขนาด (ไม่เกิน 2MB) และนามสกุลไฟล์
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024, message: 'ขนาดไฟล์หน้าปกต้องไม่เกิน 2 MB' }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    ) file: Express.Multer.File
  ) {
    // โยนไฟล์ไปให้ CloudinaryService จัดการ แล้วรับ URL รูปกลับมา
    const result = await this.cloudinaryService.uploadFile(file, 'book-covers');
    return { url: result.secure_url };
  }
}