import type { AgentContext } from './agent.types.js';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  requiresConfirmation?: boolean;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ToolHandler {
  definition: ToolDefinition;
  execute(params: Record<string, unknown>, context: AgentContext): Promise<ToolResult>;
}
