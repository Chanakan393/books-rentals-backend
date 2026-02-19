import { IsString, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// 1. สร้าง Class ย่อยสำหรับ Stock
class StockDto {
  @IsNumber()
  total: number;

  @IsNumber()
  available: number;
}

// 2. สร้าง Class ย่อยสำหรับ Pricing (3/5/7 วัน)
class PricingDto {
  @IsNumber()
  day3: number;

  @IsNumber()
  day5: number;

  @IsNumber()
  day7: number;
}

// 3. Class หลัก
export class CreateBookDto {
  @IsString()
  title: string;

  @IsString()
  author: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateNested()
  @Type(() => StockDto)
  stock: StockDto;

  @ValidateNested()
  @Type(() => PricingDto)
  pricing: PricingDto;

  @IsString()
  coverImage: string;
}