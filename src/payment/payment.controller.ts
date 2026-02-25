import { Controller, Get, Post, Body, Patch, Param, UseInterceptors, UploadedFile, UseGuards, Query } from '@nestjs/common';
import { PaymentsService } from './payment.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('Payments (ระบบแจ้งชำระเงิน)')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentsService,
    private readonly cloudinaryService: CloudinaryService 
  ) { }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'อัปโหลดสลิปการโอนเงิน' })
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file')) 
  async create(
    @Body() body: { rentalId: string, amount: number },
    @UploadedFile(
      // เช็คว่าไฟล์เกิน 2MB ไหม และเป็นไฟล์รูปภาพจริงหรือเปล่า
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024, message: 'ขนาดไฟล์สลิปต้องไม่เกิน 2 MB' }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    ) file: Express.Multer.File
  ) {
    // โยนไฟล์ขึ้น Cloudinary แล้วเอา URL สลิปที่ได้ ไปบันทึกลงฐานข้อมูลต่อ
    const result = await this.cloudinaryService.uploadFile(file, 'payment-slips');
    const slipUrl = result.secure_url;
    return this.paymentService.createPayment(body.rentalId, body.amount, slipUrl);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'แอดมินดูรายการรอตรวจสอบทั้งหมด' })
  @Get('pending')
  @UseGuards(JwtAuthGuard, AdminGuard)
  findAllPending(@Query('date') date?: string) {
    return this.paymentService.findAllPending(date);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'แอดมินอนุมัติหรือปฏิเสธสลิป' })
  @Patch('verify/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  verify(@Param('id') id: string, @Body('isApproved') isApproved: boolean) {
    return this.paymentService.verifyPayment(id, isApproved);
  }
}