import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OrchestrationService } from './orchestration/orchestration.service';

describe('AiController', () => {
  let controller: AiController;
  let service: AiService;
  let orchestration: OrchestrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: {
            chat: jest.fn().mockResolvedValue({ reply: 'hi', sessionId: 'sess-x' }),
          },
        },
        {
          provide: OrchestrationService,
          useValue: {
            run: jest.fn().mockResolvedValue({
              reply: 'ok',
              sessionId: 'sess-x',
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
    service = module.get<AiService>(AiService);
    orchestration = module.get<OrchestrationService>(OrchestrationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates chat to the service with the authenticated user id', async () => {
    const req = { user: { sub: 7 } } as any;
    await expect(controller.chat({ message: 'hi' }, req)).resolves.toEqual({
      reply: 'hi',
      sessionId: 'sess-x',
    });
    expect(service.chat).toHaveBeenCalledWith('hi', undefined, 7);
  });

  it('delegates agent chat to the orchestration service with user id and role', async () => {
    const req = { user: { sub: 7, email: 'a@b.c', role: 'student' } } as any;
    const result = await controller.agentChat({ message: 'Show my attendance' }, req);
    expect(result.reply).toBe('ok');
    expect(orchestration.run).toHaveBeenCalledWith({
      userId: 7,
      sessionId: '',
      role: 'student',
      message: 'Show my attendance',
      profile: '',
      summary: '',
    });
  });
});
