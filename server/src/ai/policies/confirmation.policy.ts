import { Injectable } from '@nestjs/common';
import type { PlanStep } from '../types/plan.types.js';

export interface ConfirmationResult {
  needsConfirmation: boolean;
  confirmationId?: string;
  summary?: string;
}

export interface PendingConfirmation {
  steps: PlanStep[];
  userId: number;
  sessionId: string;
}

@Injectable()
export class ConfirmationPolicy {
  private readonly pendingConfirmations = new Map<string, PendingConfirmation>();

  check(
    step: PlanStep,
    userId: number,
    sessionId: string,
    requiresConfirmation: string[],
  ): ConfirmationResult {
    return this.checkBatch([step], userId, sessionId, requiresConfirmation);
  }

  /**
   * Registers a batch of steps for confirmation. Only steps whose tool is in
   * `requiresConfirmation` are stored; the rest are executed without asking.
   * A bulk action such as "approve them" therefore asks once and, on confirm,
   * runs every update_outing_status step instead of just the first one.
   */
  checkBatch(
    steps: PlanStep[],
    userId: number,
    sessionId: string,
    requiresConfirmation: string[],
  ): ConfirmationResult {
    const confirmable = steps.filter((s) => requiresConfirmation.includes(s.tool));
    if (confirmable.length === 0) {
      return { needsConfirmation: false };
    }

    // At most one pending confirmation may exist per user+session.
    this.clearPendingFor(userId, sessionId);

    const id = `confirm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const summary = this.buildSummary(confirmable[0]);

    this.pendingConfirmations.set(id, { steps: confirmable, userId, sessionId });

    return { needsConfirmation: true, confirmationId: id, summary };
  }

  /**
   * Find a pending confirmation that belongs to the given user and session.
   * Only returns confirmations where BOTH the userId and sessionId match,
   * so one user can never resolve another user's (or session's) action.
   */
  getPending(
    userId: number,
    sessionId: string,
  ): { confirmationId: string; steps: PlanStep[] } | undefined {
    for (const [id, pending] of this.pendingConfirmations) {
      if (pending.userId === userId && pending.sessionId === sessionId) {
        return { confirmationId: id, steps: pending.steps };
      }
    }
    return undefined;
  }

  remove(confirmationId: string): void {
    this.pendingConfirmations.delete(confirmationId);
  }

  buildSummary(step: PlanStep): string {
    const paramStr = Object.entries(step.params)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(', ');
    return `Execute ${step.tool}(${paramStr})`;
  }

  /**
   * Legacy direct resolution by confirmationId. Kept for compatibility;
   * the agent flow uses getPending + remove instead so that both
   * userId and sessionId are verified.
   */
  resolve(confirmationId: string, approved: boolean, userId: number): PlanStep[] | null {
    const pending = this.pendingConfirmations.get(confirmationId);
    if (!pending || pending.userId !== userId) return null;
    this.pendingConfirmations.delete(confirmationId);
    return approved ? pending.steps : null;
  }

  private clearPendingFor(userId: number, sessionId: string): void {
    for (const [id, pending] of this.pendingConfirmations) {
      if (pending.userId === userId && pending.sessionId === sessionId) {
        this.pendingConfirmations.delete(id);
      }
    }
  }
}
