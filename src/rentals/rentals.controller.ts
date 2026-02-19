import { Controller, Post, Body, Param, Patch, UseGuards, Req, Get, ForbiddenException } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) { }

  @UseGuards(JwtAuthGuard)
  @Post('rent')
  async create(@Req() req, @Body() body: { bookId: string; days: number }) {
    return this.rentalsService.rentBook(req.user.userId, body.bookId, body.days);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.rentalsService.cancelRental(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/pickup') // ลูกค้ายื่นจอให้แอดมินกดยืนยันรับของ
  async pickup(@Param('id') id: string) {
    return this.rentalsService.pickupBook(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/return') // คืนหนังสือ
  async returnBook(@Param('id') id: string) {
    return this.rentalsService.returnBook(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-history')
  async getMyHistory(@Req() req) {
    return this.rentalsService.findMyHistory(req.user.userId);
  }
}