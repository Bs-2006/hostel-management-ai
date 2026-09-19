import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { AgentStateService } from './state/agent-state.service';

const originalFetch = globalThis.fetch;
const originalKey = process.env['XAI_API_KEY'];

const makeSession = (id = 'sess-x') => ({
  id,
  conversationId: 1,
  userId: 1,
  title: 'New chat',
  summary: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('AiService', () => {
  let service: AiService;
  let mockFetch: jest.Mock;
  let state: {
    getOrCreateSession: jest.Mock;
    getHistory: jest.Mock;
    countMessages: jest.Mock;
    appendTurn: jest.Mock;
    setSummary: jest.Mock;
    getProfile: jest.Mock;
    setProfile: jest.Mock;
  };

  beforeEach(async () => {
    state = {
      getOrCreateSession: jest.fn().mockResolvedValue(makeSession()),
      getHistory: jest.fn().mockResolvedValue([]),
      countMessages: jest.fn().mockResolvedValue(0),
      appendTurn: jest.fn().mockResolvedValue(undefined),
      setSummary: jest.fn().mockResolvedValue(undefined),
      getProfile: jest.fn().mockResolvedValue(''),
      setProfile: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: AgentStateService, useValue: state },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    mockFetch = jest.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env['XAI_API_KEY'];
    } else {
      process.env['XAI_API_KEY'] = originalKey;
    }
    jest.restoreAllMocks();
  });

  const useMockFetch = () => {
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects empty messages', async () => {
    await expect(service.chat('   ')).resolves.toEqual({
      reply: 'Please type a message.',
      sessionId: '',
    });
  });

  it('tells the user when no API key is configured', async () => {
    delete process.env['XAI_API_KEY'];
    const res = await service.chat('hi', undefined, 1);
    expect(res.reply).toContain('XAI_API_KEY');
    expect(res.sessionId).toBe('sess-x');
  });

  describe('with an API key', () => {
    beforeEach(() => {
      process.env['XAI_API_KEY'] = 'xai-test-key';
      useMockFetch();
    });

    it('calls the API with the right payload and trims the reply', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: '  Hello from Grok!  ' } }],
        }),
      });

      const res = await service.chat('hello', undefined, 1);

      expect(res.reply).toBe('Hello from Grok!');
      expect(res.sessionId).toBe('sess-x');

      const [url, init] = mockFetch.mock.calls[0] as unknown as [
        string,
        { headers: Record<string, string>; body: string; method: string },
      ];
      expect(url).toBe('https://api.x.ai/v1/chat/completions');
      expect(init.method).toBe('POST');
      expect(init.headers['Authorization']).toBe('Bearer xai-test-key');
      const body = JSON.parse(init.body);
      expect(body.model).toBeDefined();
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[1].content).toBe('hello');
    });

    it('sends previous turns back to the model for the same session', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Understood' } }],
        }),
      });

      state.getHistory
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 1,
            role: 'user',
            content: 'My room number is 204',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ]);

      await service.chat('My room number is 204', undefined, 1);
      state.getOrCreateSession.mockResolvedValue(makeSession('sess-x'));

      await service.chat('What room did I mention?', 'sess-x', 1);

      const [, init] = mockFetch.mock.calls[1] as unknown as [
        string,
        { body: string },
      ];
      const body = JSON.parse(init.body);
      const roles = body.messages.map((m: { role: string }) => m.role);
      expect(roles).toContain('user');
      expect(
        body.messages.some(
          (m: { content: string }) => m.content === 'My room number is 204',
        ),
      ).toBe(true);
    });

    it('falls back gracefully when the API call fails', async () => {
      mockFetch.mockRejectedValue(new Error('network down'));
      const res = await service.chat('hi', undefined, 1);
      expect(res.reply).toContain('Sorry');
    });

    it('falls back gracefully on a non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });
      const res = await service.chat('hi', undefined, 1);
      expect(res.reply).toContain('Sorry');
    });
  });
});