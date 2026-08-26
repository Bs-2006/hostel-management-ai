import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, Min } from 'class-validator';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
}

export class CreateAttendanceDto {
  @ApiProperty({ example: 1, description: 'Student ID' })
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({ example: '2026-08-26', description: 'Attendance date (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.PRESENT })
  @IsEnum(AttendanceStatus, { message: 'status must be PRESENT or ABSENT' })
  status: AttendanceStatus;
}

export class UpdateAttendanceDto {
  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.ABSENT })
  @IsEnum(AttendanceStatus, { message: 'status must be PRESENT or ABSENT' })
  status: AttendanceStatus;
}
