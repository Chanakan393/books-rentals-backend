import { Controller, Post, Body, Param, Patch, UseGuards, Req, Get, Query, ForbiddenException } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Rentals (ระบบการเช่าหนังสือ)')
@ApiBearerAuth()
@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) { }

  // ==========================================
  // โซน Member สำหรับลูกค้าทั่วไป
  // ==========================================

  @ApiOperation({ summary: 'ลูกค้าทำรายการเช่าหนังสือ' })
  @ApiResponse({ status: 201, description: 'สร้างรายการเช่าสำเร็จ' })
  @UseGuards(JwtAuthGuard)
  @Post('rent')
  async create(@Req() req, @Body() body: { bookId: string; days: number }) {
    return this.rentalsService.rentBook(req.user.userId, body.bookId, body.days);
  }

  @ApiOperation({ summary: 'ลูกค้าดูประวัติการเช่าของตัวเอง' })
  @UseGuards(JwtAuthGuard)
  @Get('my-history')
  async getMyHistory(@Req() req) {
    return this.rentalsService.findMyHistory(req.user.userId);
  }

  @ApiOperation({ summary: 'ลูกค้ายกเลิกรายการเช่า (ต้องยังไม่จ่ายเงิน/รับของ)' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req) {
    return this.rentalsService.cancelRental(id, req.user.userId);
  }

  // ==========================================
  // โซน Admin Only สำหรับจัดการหลังร้าน
  // ==========================================

  @ApiOperation({ summary: 'แอดมินดูรายงานสถิติหน้า Dashboard' })
  @ApiQuery({ name: 'date', required: false, description: 'ระบุวันที่ต้องการดู (YYYY-MM-DD)' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('dashboard')
  async getDashboardReports(@Query('date') date?: string) {
    return this.rentalsService.getDashboardReports(date);
  }

  @ApiOperation({ summary: 'แอดมินยืนยันว่าลูกค้ารับหนังสือไปแล้ว (เปลี่ยนสถานะเป็น rented)' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/pickup')
  async pickup(@Param('id') id: string) {
    return this.rentalsService.pickupBook(id);
  }

  @ApiOperation({ summary: 'แอดมินยืนยันการรับคืนหนังสือ (และคำนวณค่าปรับอัตโนมัติ)' })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/return')
  async returnBook(@Param('id') id: string) {
    return this.rentalsService.returnBook(id);
  }
}