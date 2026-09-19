import { Injectable } from '@nestjs/common';
import type { ToolHandler } from '../types/tool.types.js';
import { ToolNotFoundError } from '../errors/agent.errors.js';

@Injectable()
export class ToolRegistry {
  private readonly tools = new Map<string, ToolHandler>();

  register(handler: ToolHandler): void {
    this.tools.set(handler.definition.name, handler);
  }

  get(name: string): ToolHandler {
    const tool = this.tools.get(name);
    if (!tool) throw new ToolNotFoundError(name);
    return tool;
  }

  getAll(): ToolHandler[] {
    return Array.from(this.tools.values());
  }

  getToolList(): string {
    return this.getAll()
      .map((t) => {
        const params = t.definition.parameters
          .map((p) => `  ${p.name} (${p.type}${p.required ? ', required' : ''}): ${p.description}`)
          .join('\n');
        return `- ${t.definition.name}: ${t.definition.description}\n${params}`;
      })
      .join('\n\n');
  }
}
