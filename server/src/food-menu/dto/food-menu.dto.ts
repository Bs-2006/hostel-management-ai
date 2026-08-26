import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export class CreateFoodMenuDto {
  @ApiProperty({ enum: DayOfWeek, example: DayOfWeek.MONDAY })
  @IsEnum(DayOfWeek, { message: 'day must be a valid day of the week (MONDAY–SUNDAY)' })
  day: DayOfWeek;

  @ApiProperty({ example: 'Idly, Sambar' })
  @IsString()
  breakfast: string;

  @ApiProperty({ example: 'Rice, Dal, Curry' })
  @IsString()
  lunch: string;

  @ApiProperty({ example: 'Tea, Biscuits' })
  @IsString()
  snacks: string;

  @ApiProperty({ example: 'Chapati, Curry' })
  @IsString()
  dinner: string;
}

export class UpdateFoodMenuDto {
  @ApiPropertyOptional({ example: 'Poha, Juice' })
  @IsOptional()
  @IsString()
  breakfast?: string;

  @ApiPropertyOptional({ example: 'Rice, Sambar, Vegetable Curry' })
  @IsOptional()
  @IsString()
  lunch?: string;

  @ApiPropertyOptional({ example: 'Coffee, Cake' })
  @IsOptional()
  @IsString()
  snacks?: string;

  @ApiPropertyOptional({ example: 'Roti, Paneer' })
  @IsOptional()
  @IsString()
  dinner?: string;
}
