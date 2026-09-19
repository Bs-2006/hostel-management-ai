export type AgentMessageRole = 'user' | 'assistant';

export interface AgentMessage {
  id: number;
  role: AgentMessageRole;
  content: string;
  createdAt: string;
}

/**
 * A persisted conversation between a user and the AI assistant, backed by
 * the PostgreSQL `AiConversation` table. `id` is the public session id
 * returned to the client; `conversationId` is the internal primary key;
 * messages are stored in the `AiMessage` table.
 */
export interface AgentSession {
  id: string;
  conversationId: number;
  userId: number;
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}