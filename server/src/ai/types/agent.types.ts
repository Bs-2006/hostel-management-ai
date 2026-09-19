import type { ToolDefinition } from './tool.types.js';

export interface AgentContext {
  userId: number;
  sessionId: string;
  role: 'student' | 'warden';
  message: string;
  profile: string;
  summary: string;
  userName?: string;
  /**
   * Serialized tool results (including record IDs) from the most recent turn.
   * Injected into the planner so follow-up actions like "approve both" can use
   * the outing/complaint IDs that were already fetched and shown previously.
   */
  recentToolResults?: string;
}

export interface AgentResponse {
  reply: string;
  sessionId: string;
  actions?: ExecutedAction[];
  confirmationId?: string;
  confirmationSummary?: string;
}

export interface ExecutedAction {
  tool: string;
  params: Record<string, unknown>;
  result: unknown;
  success: boolean;
  error?: string;
}

export interface AgentConfig {
  model: string;
  url: string;
  apiKey: string;
  maxTokens: number;
  maxPlanSteps: number;
  requireConfirmation: string[];
}
