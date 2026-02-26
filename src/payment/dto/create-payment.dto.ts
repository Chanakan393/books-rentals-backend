import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNumber } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ 
    example: '65c8f1a2b3c4d5e6f7a8b9c0', 
    description: 'รหัสรายการเช่าหนังสือ (Rental ID)' 
  })
  @IsString()
  rentalId: string;

  @ApiProperty({ 
    example: 150, 
    description: 'ยอดเงินที่ชำระตามจริง' 
  })

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ 
    type: 'string', 
    format: 'binary', 
    description: 'ไฟล์สลิปโอนเงิน (รองรับ .jpg, .png, .webp)' 
  })
  file: any;
}