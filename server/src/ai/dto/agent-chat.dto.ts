import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AgentChatDto {
  @ApiProperty({ example: 'Show my attendance' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: 'sess-abc123', required: false })
  @IsString()
  @IsOptional()
  sessionId?: string;
}
