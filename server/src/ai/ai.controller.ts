import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service.js';
import type { ChatReply } from './ai.service.js';
import { OrchestrationService } from './orchestration/orchestration.service.js';
import type { AgentResponse } from './types/agent.types.js';
import { ChatDto } from './dto/chat.dto.js';
import { AgentChatDto } from './dto/agent-chat.dto.js';
import { JwtGuard } from '../common/guards/jwt.guard.js';
import { AuthService } from '../auth/auth.service.js';
import type { Request } from 'express';

interface JwtUser {
  sub: number;
  email: string;
  role: 'student' | 'warden';
}

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly orchestration: OrchestrationService,
    private readonly auth: AuthService,
  ) {}

  @Post('chat')
  @ApiOkResponse({ description: 'Chatbot reply' })
  chat(@Body() dto: ChatDto, @Req() req: Request): Promise<ChatReply> {
    const userId = (req as { user?: { sub?: number } }).user?.sub;
    return this.aiService.chat(dto.message, dto.sessionId, userId);
  }

  @Post('agent/chat')
  @ApiOkResponse({ description: 'Agent (tool-using) reply' })
  async agentChat(@Body() dto: AgentChatDto, @Req() req: Request): Promise<AgentResponse> {
    const user = (req as { user?: JwtUser }).user!;
    console.log(
      `[AGENT AUTH] userId=${user.sub} role=${String(user.role || '').toUpperCase() || 'UNKNOWN'}`,
    );

    let userName = '';
    try {
      const me = await this.auth.getMe({ sub: user.sub, email: user.email, role: user.role });
      userName = (me as { name?: string }).name ?? '';
    } catch {
      // Name is best-effort; the agent still works without it.
    }

    return this.orchestration.run({
      userId: user.sub,
      sessionId: dto.sessionId ?? '',
      role: user.role,
      message: dto.message,
      profile: '',
      summary: '',
      userName,
    });
  }
}