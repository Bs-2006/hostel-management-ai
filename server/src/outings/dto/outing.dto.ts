import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, Matches } from 'class-validator';

export class CreateOutingDto {
  @ApiProperty({ example: 'Chennai Central Mall' })
  @IsString()
  destination: string;

  @ApiProperty({ example: 'Family visit' })
  @IsString()
  reason: string;

  @ApiProperty({ example: '2026-08-30', description: 'Date of outing (YYYY-MM-DD)' })
  @IsDateString()
  outingDate: string;

  @ApiProperty({ example: '09:00', description: 'Check-out time (HH:MM)' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'outTime must be in HH:MM format' })
  outTime: string;

  @ApiProperty({ example: '18:00', description: 'Expected return time (HH:MM)' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'inTime must be in HH:MM format' })
  inTime: string;
}
