import { Injectable } from '@nestjs/common';
import type { ExecutedAction } from '../types/agent.types.js';

@Injectable()
export class VerifierService {
  formatActionResult(actions: ExecutedAction[]): string {
    if (actions.length === 0) return '';

    return actions
      .map((a) => {
        if (!a.success) return `Tool ${a.tool} failed: ${a.error}`;
        return `Tool ${a.tool} executed successfully. Result:\n${this.pretty(a.result)}`;
      })
      .join('\n');
  }

  private pretty(value: unknown): string {
    if (value === undefined || value === null) return 'no data';
    if (Array.isArray(value)) {
      if (value.length === 0) return '[] (no records found)';
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }

  allSucceeded(actions: ExecutedAction[]): boolean {
    return actions.every((a) => a.success);
  }

  getFailedAction(actions: ExecutedAction[]): ExecutedAction | undefined {
    return actions.find((a) => !a.success);
  }
}
