import { IsString, IsNumber, IsOptional, ValidateNested, Min, IsArray, MaxLength, IsInt, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

// Class ย่อยสำหรับ Stock
class StockDto {
  @IsInt()
  @Min(1)
  total: number;

  @IsInt()
  @Min(0)
  available: number;
}

// Class ย่อยสำหรับ Pricing (3/5/7 วัน)
class PricingDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  day3: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  day5: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  day7: number;
}

// Class หลัก
export class CreateBookDto {
  @IsString()
  title: string;

  @IsString()
  author: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'ต้องเลือกหมวดหมู่อย่างน้อย 1 หมวดหมู่' })
  category: string[];

  @IsOptional()
  @IsString()
  @MaxLength(3000)
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