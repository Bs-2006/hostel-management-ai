import { Injectable } from '@nestjs/common';
import type { ToolHandler } from '../types/tool.types.js';
import { ValidationError } from '../errors/agent.errors.js';

@Injectable()
export class ValidationPolicy {
  validate(tool: ToolHandler, params: Record<string, unknown>): void {
    for (const param of tool.definition.parameters) {
      const value = params[param.name];

      if (param.required && (value === undefined || value === null || value === '')) {
        throw new ValidationError(`Missing required parameter "${param.name}" for tool "${tool.definition.name}".`);
      }

      if (value !== undefined && value !== null && param.enum && !param.enum.includes(String(value))) {
        throw new ValidationError(
          `Parameter "${param.name}" must be one of: ${param.enum.join(', ')}. Received: "${value}".`,
        );
      }

      if (value !== undefined && value !== null) {
        if (param.type === 'number' && typeof value !== 'number') {
          const parsed = Number(value);
          if (isNaN(parsed)) {
            throw new ValidationError(`Parameter "${param.name}" must be a number. Received: "${value}".`);
          }
        }
      }
    }
  }
}
