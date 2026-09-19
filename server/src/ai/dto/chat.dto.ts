import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatDto {
  @ApiProperty({ example: 'hi' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: 'sess-abc123', required: false })
  @IsString()
  @IsOptional()
  sessionId?: string;
}