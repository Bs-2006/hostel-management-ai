import { Injectable } from '@nestjs/common';
import { SafetyBlockedError } from '../errors/agent.errors.js';
import type { AgentContext } from '../types/agent.types.js';

const BLOCKED_PATTERNS = [
  /drop\s+table/i,
  /delete\s+from/i,
  /truncate/i,
  /exec\s*\(/i,
  /<script/i,
];

@Injectable()
export class SafetyPolicy {
  check(message: string, _context: AgentContext): void {
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(message)) {
        throw new SafetyBlockedError('Potentially harmful content detected in message.');
      }
    }
  }

  checkToolParams(toolName: string, params: Record<string, unknown>): void {
    for (const value of Object.values(params)) {
      if (typeof value === 'string') {
        for (const pattern of BLOCKED_PATTERNS) {
          if (pattern.test(value)) {
            throw new SafetyBlockedError(`Potentially harmful content detected in parameter for "${toolName}".`);
          }
        }
      }
    }
  }
}
