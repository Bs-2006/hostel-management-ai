import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AssignRoomDto {
  @ApiProperty({ example: 10, description: 'ID of the room to assign' })
  @IsInt()
  @Min(1)
  roomId: number;
}

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: 'Mechanical Engineering' })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  year?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  roomId?: number;
}
