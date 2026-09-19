import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AgentMessage, AgentSession } from './agent-session.types.js';

const NEW_CHAT_TITLE = 'New chat';
const TITLE_MAX_LENGTH = 64;
const SUMMARY_MAX_LENGTH = 2000;
const PROFILE_MAX_LENGTH = 3000;

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function makeSessionId(): string {
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

interface ConversationRow {
  id: number;
  userId: number;
  sessionId: string;
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

function toSession(row: ConversationRow): AgentSession {
  return {
    id: row.sessionId,
    conversationId: row.id,
    userId: row.userId,
    title: row.title,
    summary: row.summary,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class AgentStateService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateSession(userId: number, sessionId?: string | null): Promise<AgentSession> {
    const db = this.prisma.client;

    if (sessionId && sessionId.trim()) {
      const existing = await db.orm.public.AiConversation.where({ sessionId, userId }).first();
      if (existing) return toSession(existing);
      // The session id belongs to another user (or is unknown): mint a fresh
      // one so the global unique constraint is respected and users stay isolated.
      sessionId = undefined;
    }

    const created = await db.orm.public.AiConversation.create({
      userId,
      sessionId: sessionId && sessionId.trim() ? sessionId : makeSessionId(),
      title: NEW_CHAT_TITLE,
      summary: '',
    });
    return toSession(created);
  }

  async getSession(userId: number, sessionId: string): Promise<AgentSession | undefined> {
    const row = await this.prisma.client.orm.public.AiConversation.where({ sessionId, userId }).first();
    return row ? toSession(row) : undefined;
  }

  async listSessions(userId: number): Promise<AgentSession[]> {
    const rows = await this.prisma.client.orm.public.AiConversation.where({ userId }).all();
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(toSession);
  }

  async countMessages(userId: number, sessionId: string): Promise<number> {
    const conversation = await this.findConversation(userId, sessionId);
    if (!conversation) return 0;
    const messages = await this.prisma.client.orm.public.AiMessage.where({ conversationId: conversation.id }).all();
    return messages.length;
  }

  async getHistory(userId: number, sessionId: string, limit: number): Promise<AgentMessage[]> {
    const conversation = await this.findConversation(userId, sessionId);
    if (!conversation) return [];
    const messages = await this.prisma.client.orm.public.AiMessage.where({ conversationId: conversation.id }).all();
    return messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .sort((a, b) => a.id - b.id)
      .slice(-Math.max(1, limit))
      .map((m) => ({ id: m.id, role: m.role as AgentMessage['role'], content: m.content, createdAt: m.createdAt }));
  }

  /**
   * Persists a compact string of the raw tool results (including record IDs)
   * from the most recent turn as a synthetic `context` message. It is never
   * shown to the user or sent as a chat turn; instead it is fed back to the
   * planner on the next message so follow-up actions can reuse those IDs.
   */
  async appendToolContext(userId: number, sessionId: string, context: string): Promise<void> {
    const clean = context.trim();
    if (!clean) return;
    const conversation = await this.findConversation(userId, sessionId);
    if (!conversation) return;
    await this.prisma.client.orm.public.AiMessage.create({
      conversationId: conversation.id,
      role: 'context',
      content: clean,
    });
  }

  /**
   * Returns the serialized tool results of the most recent turn (or the two most
   * recent turns) as a single string, so the planner has access to the IDs that
   * were surfaced in earlier replies.
   */
  async getRecentToolResults(userId: number, sessionId: string, limit = 2): Promise<string> {
    const conversation = await this.findConversation(userId, sessionId);
    if (!conversation) return '';
    const messages = await this.prisma.client.orm.public.AiMessage.where({ conversationId: conversation.id }).all();
    return messages
      .filter((m) => m.role === 'context')
      .sort((a, b) => a.id - b.id)
      .slice(-Math.max(1, limit))
      .map((m) => m.content)
      .join('\n');
  }

  async appendTurn(userId: number, sessionId: string, userContent: string, assistantContent: string): Promise<void> {
    const db = this.prisma.client;
    const conversation = await this.findConversation(userId, sessionId);
    if (!conversation) return;

    if (conversation.title === NEW_CHAT_TITLE) {
      const title = truncate(userContent.trim() || 'New chat', TITLE_MAX_LENGTH);
      await db.orm.public.AiConversation.where({ id: conversation.id }).update({ title });
    }

    await db.orm.public.AiMessage.create({ conversationId: conversation.id, role: 'user', content: userContent });
    await db.orm.public.AiMessage.create({ conversationId: conversation.id, role: 'assistant', content: assistantContent });
  }

  async setSummary(userId: number, sessionId: string, summary: string): Promise<void> {
    const conversation = await this.findConversation(userId, sessionId);
    if (!conversation) return;
    const clean = summary.trim();
    await this.prisma.client.orm.public.AiConversation.where({ id: conversation.id }).update({
      summary: clean ? truncate(clean, SUMMARY_MAX_LENGTH) : '',
    });
  }

  async deleteSession(userId: number, sessionId: string): Promise<void> {
    const conversation = await this.findConversation(userId, sessionId);
    if (!conversation) return;
    const db = this.prisma.client;
    while ((await db.orm.public.AiMessage.where({ conversationId: conversation.id }).delete()) != null) {
      // delete() removes a single row; repeat until no messages remain.
    }
    await db.orm.public.AiConversation.where({ id: conversation.id }).delete();
  }

  async getProfile(userId: number): Promise<string> {
    const user = await this.prisma.client.orm.public.User.where({ id: userId }).first();
    return (user?.aiProfile as string | undefined) ?? '';
  }

  async setProfile(userId: number, profile: string): Promise<void> {
    const clean = profile.trim();
    await this.prisma.client.orm.public.User.where({ id: userId }).update({
      aiProfile: clean ? clean.slice(0, PROFILE_MAX_LENGTH) : '',
    });
  }

  private async findConversation(userId: number, sessionId: string): Promise<ConversationRow | undefined> {
    const row = await this.prisma.client.orm.public.AiConversation.where({ sessionId, userId }).first();
    return row ?? undefined;
  }
}