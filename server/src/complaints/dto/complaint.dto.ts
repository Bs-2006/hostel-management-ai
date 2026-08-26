import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export class CreateComplaintDto {
  @ApiProperty({ example: 'Water problem' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'No water supply in my room' })
  @IsString()
  description: string;
}

export enum ComplaintStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export class UpdateComplaintStatusDto {
  @ApiProperty({ enum: ComplaintStatus, example: ComplaintStatus.RESOLVED })
  @IsEnum(ComplaintStatus, {
    message: 'status must be one of: PENDING, IN_PROGRESS, RESOLVED, REJECTED',
  })
  status: ComplaintStatus;
}
