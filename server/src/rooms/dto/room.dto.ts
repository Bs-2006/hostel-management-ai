import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'A101' })
  @IsString()
  roomNumber: string;

  @ApiProperty({ example: 'A' })
  @IsString()
  block: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  floor: number;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  capacity: number;
}

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: 'B' })
  @IsOptional()
  @IsString()
  block?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  floor?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  occupied?: number;
}
