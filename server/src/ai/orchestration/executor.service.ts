import { Injectable } from '@nestjs/common';
import type { AgentContext, ExecutedAction } from '../types/agent.types.js';
import type { PlanStep } from '../types/plan.types.js';
import { ToolRegistry } from '../tools/tool.registry.js';
import { ValidationPolicy } from '../policies/validation.policy.js';
import { PermissionPolicy } from '../policies/permission.policy.js';
import { SafetyPolicy } from '../policies/safety.policy.js';

@Injectable()
export class ExecutorService {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly validationPolicy: ValidationPolicy,
    private readonly permissionPolicy: PermissionPolicy,
    private readonly safetyPolicy: SafetyPolicy,
  ) {}

  async executeStep(step: PlanStep, context: AgentContext): Promise<ExecutedAction> {
    const tool = this.toolRegistry.get(step.tool);

    try {
      this.permissionPolicy.check(step.tool, context);
      console.log(
        `[AGENT PERMISSION] role=${String(context.role || '').toUpperCase()} tool=${step.tool} allowed=true`,
      );
      this.validationPolicy.validate(tool, step.params);
      this.safetyPolicy.checkToolParams(step.tool, step.params);

      const result = await tool.execute(step.params, context);
      const count = Array.isArray(result.data) ? result.data.length : (result.data ? 1 : 0);
      console.log(
        `[AGENT TOOL RESULT] tool=${step.tool} success=${result.success} records=${count}`,
      );
      return {
        tool: step.tool,
        params: step.params,
        result: result.data,
        success: result.success,
        error: result.error,
      };
    } catch (err) {
      console.log(
        `[AGENT PERMISSION] role=${String(context.role || '').toUpperCase()} tool=${step.tool} allowed=false err=${err instanceof Error ? err.message : 'unknown'}`,
      );
      return {
        tool: step.tool,
        params: step.params,
        result: null,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async executePlan(steps: PlanStep[], context: AgentContext): Promise<ExecutedAction[]> {
    const actions: ExecutedAction[] = [];
    for (const step of steps) {
      const action = await this.executeStep(step, context);
      actions.push(action);
      if (!action.success) break;
    }
    return actions;
  }
}
