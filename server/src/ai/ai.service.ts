import { Injectable } from '@nestjs/common';
import { AgentStateService } from './state/agent-state.service.js';
import { AgentMessage } from './state/agent-session.types.js';

export interface ChatReply {
  reply: string;
  sessionId: string;
}

const DEFAULT_URL = 'https://api.x.ai/v1/chat/completions';
const DEFAULT_MODEL = 'grok-4.6';

// Messages sent back to the model per turn (bounds token usage).
const MAX_CONTEXT_MESSAGES = 20;
// Regenerate the session summary every N messages (3 turns of user+assistant).
const SUMMARY_EVERY_MESSAGES = 6;

const SYSTEM_PROMPT =
  'You are a friendly, helpful AI assistant. Use the conversation summary and previous messages below to stay consistent with earlier topics. Keep your answers clear and concise.';

@Injectable()
export class AiService {
  constructor(private readonly state: AgentStateService) {}

  async chat(message: string, sessionId?: string, userId?: number): Promise<ChatReply> {
    const content = message.trim();
    if (!content) {
      return { reply: 'Please type a message.', sessionId: sessionId ?? '' };
    }

    // TEMPORARY safe diagnostic logging (no JWT/API key is ever logged).
    console.log(
      `[ai/debug] chat start userId=${userId ?? '(none)'} incomingSessionId=${sessionId ?? '(none)'}`,
    );

    const session = await this.state.getOrCreateSession(userId ?? 0, sessionId);
    const sessionIdOut = session.id;

    const apiKey = process.env['XAI_API_KEY'];
    if (!apiKey) {
      return {
        reply: 'Add your XAI_API_KEY to .env to enable the chatbot.',
        sessionId: sessionIdOut,
      };
    }

    const model = process.env['XAI_MODEL'] || DEFAULT_MODEL;
    const url = process.env['XAI_URL'] || DEFAULT_URL;

    try {
      const history = await this.state.getHistory(userId ?? 0, session.id, MAX_CONTEXT_MESSAGES);
      const profile = await this.state.getProfile(userId ?? 0);
      console.log(
        `[ai/debug] resolved conversationId=${session.conversationId} sessionId=${session.id} summaryLen=${session.summary.length} profileLen=${profile.length} historyRows=${history.length}`,
      );
      console.log(
        `[ai/debug] history contents: ${
          history
            .map((m) => `${m.role}: ${(m.content || '').slice(0, 120)}`)
            .join(' || ') || '(empty)'
        }`,
      );
      const reply = await this.llmReply(
        content,
        apiKey,
        model,
        url,
        profile,
        session.summary,
        history,
      );

      // Persist the turn so the next request has this conversation as context.
      await this.state.appendTurn(userId ?? 0, session.id, content, reply);
      await this.maybeSummarize(userId ?? 0, session.id, apiKey, model, url);
      await this.maybeUpdateProfile(userId ?? 0, content, reply, apiKey, model, url);

      return { reply, sessionId: sessionIdOut };
    } catch (err) {
      console.error(
        '[ai/chat] request failed:',
        err instanceof Error ? `${err.name}: ${err.message}` : err,
      );
      return {
        reply: 'Sorry, I could not generate a response right now.',
        sessionId: sessionIdOut,
      };
    }
  }

  /**
   * TEMPORARY diagnostic logging: prints the exact provider status and body
   * on failure. Does NOT include request headers, so the API key never leaks.
   */
  private logProviderFailure(
    tag: string,
    url: string,
    status: number,
    bodyText: string,
    originalError?: unknown,
  ): void {
    console.error(`[${tag}] provider request failed
  url: ${url}
  http status: ${status}
  response body: ${bodyText}
  error message: ${
    originalError instanceof Error ? originalError.message : 'n/a'
  }`);
  }

  private async llmReply(
    message: string,
    apiKey: string,
    model: string,
    url: string,
    profile: string,
    summary: string,
    history: AgentMessage[],
  ): Promise<string> {
    const systemParts = [SYSTEM_PROMPT];
    if (profile) {
      systemParts.push(`Long-term notes about this user:\n${profile}`);
    }
    if (summary) {
      systemParts.push(`Conversation summary so far:\n${summary}`);
    }
    const system = systemParts.join('\n\n');

    const payload = {
      model,
      messages: [
        { role: 'system', content: system },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
      max_tokens: 300,
    };

    // TEMPORARY safe diagnostic logging (content only, never headers/key).
    console.log(
      `[ai/debug] provider payload url=${url} model=${model} messages=${payload.messages.length} => ${payload.messages
        .map((m) => `${m.role}: ${(m.content || '').slice(0, 120)}`)
        .join(' || ')}`,
    );

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      const error = new Error(`xAI returned ${res.status}: ${text}`);
      this.logProviderFailure('ai/chat', url, res.status, text, error);
      throw error;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || 'Sorry, I could not generate a response.';
  }

  /**
   * Keeps the session summary fresh so long conversations stay grounded
   * even after the message history is trimmed.
   */
  private async maybeSummarize(
    userId: number,
    sessionId: string,
    apiKey: string,
    model: string,
    url: string,
  ): Promise<void> {
    const messageCount = await this.state.countMessages(userId, sessionId);
    if (messageCount < SUMMARY_EVERY_MESSAGES) return;

    const recent = await this.state.getHistory(userId, sessionId, SUMMARY_EVERY_MESSAGES);
    const transcript = recent
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    try {
      const summary = await this.summarizeText(transcript, apiKey, model, url);
      await this.state.setSummary(userId, sessionId, summary);
    } catch (err) {
      // Summaries are best-effort; a failure should never fail the chat.
      console.warn('Session summary update failed:', err);
    }
  }

  private async summarizeText(
    transcript: string,
    apiKey: string,
    model: string,
    url: string,
    maxTokens = 120,
  ): Promise<string> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Write a concise summary (2-3 sentences) of this conversation. Capture the main topic, key facts, and any decisions or requests. Keep names and specifics.',
          },
          { role: 'user', content: transcript },
        ],
        max_tokens: maxTokens,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const error = new Error(`xAI returned ${res.status}: ${text}`);
      this.logProviderFailure('ai/summarize', url, res.status, text, error);
      throw error;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  /**
   * Keeps a per-user, cross-session memory profile in sync with every turn
   * so a brand-new conversation still knows facts from earlier chats. This
   * is best-effort: a failure must never fail the chat itself.
   */
  private async maybeUpdateProfile(
    userId: number,
    userMessage: string,
    assistantMessage: string,
    apiKey: string,
    model: string,
    url: string,
  ): Promise<void> {
    try {
      const profile = await this.state.getProfile(userId);
      const merged = await this.summarizeText(
        [
          'You maintain a memory profile of facts about this user gathered from their AI conversations.',
          'Existing profile:',
          profile || '(empty)',
          '',
          'Latest exchange to fold in:',
          `User: ${userMessage}`,
          `Assistant: ${assistantMessage}`,
          '',
          'Reply with ONLY the updated profile (2-4 concise sentences). Keep the important facts from ALL exchanges so far: names, preferences, requests, and decisions.',
        ].join('\n'),
        apiKey,
        model,
        url,
        200,
      );
      await this.state.setProfile(userId, merged);
    } catch (err) {
      // Best-effort: cross-session memory must never break the chat.
      console.warn('User profile update failed:', err);
    }
  }
}