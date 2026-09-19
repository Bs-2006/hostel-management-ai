import { Injectable } from '@nestjs/common';
import type { AgentContext } from '../types/agent.types.js';
import type { Plan, PlanStep } from '../types/plan.types.js';
import { buildAgentSystemPrompt, PLAN_USER_TEMPLATE } from '../prompts/agent.prompt.js';
import { ToolRegistry } from '../tools/tool.registry.js';

const DEFAULT_URL = 'https://api.x.ai/v1/chat/completions';
const DEFAULT_MODEL = 'grok-4.6';

@Injectable()
export class PlannerService {
  constructor(private readonly toolRegistry: ToolRegistry) {}

  async createPlan(context: AgentContext, history: { role: string; content: string }[]): Promise<Plan> {
    const apiKey = process.env['XAI_API_KEY'];
    if (!apiKey) {
      return {
        steps: [],
        finalReply: 'Add your XAI_API_KEY to .env to enable the agent.',
        isComplete: true,
      };
    }

    const model = process.env['XAI_MODEL'] || DEFAULT_MODEL;
    const url = process.env['XAI_URL'] || DEFAULT_URL;

    const toolList = this.toolRegistry.getToolList();
    const today = this.todayDate();

    // Normalize role — guard against undefined/null/wrong case from JWT
    const rawRole = (context.role as string | undefined | null) ?? '';
    const role: 'student' | 'warden' = rawRole.toLowerCase().trim() === 'warden' ? 'warden' : 'student';

    console.log(`[PLANNER] role="${context.role}" normalized="${role}" user="${context.userName || 'unknown'}"`);

    const systemPrompt = buildAgentSystemPrompt(
      role,
      (context.userName || '').trim() || 'User',
      toolList,
      today,
    );
    const userPrompt = PLAN_USER_TEMPLATE(
      context.message,
      context.profile,
      context.summary,
      context.userName,
      context.recentToolResults,
    );

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1200,  // increased for bulk multi-step plans
      response_format: { type: 'json_object' },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[planner] LLM error ${res.status}: ${text}`);
      return {
        steps: [],
        finalReply: 'Sorry, I could not process your request right now.',
        isComplete: true,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const raw = data.choices?.[0]?.message?.content?.trim() || '{}';
    return this.parsePlan(raw);
  }

  private todayDate(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private parsePlan(raw: string): Plan {
    try {
      const parsed = JSON.parse(raw);
      const steps: PlanStep[] = (parsed.steps || []).map((s: Record<string, unknown>, i: number) => ({
        id: i + 1,
        tool: s.tool as string,
        params: (s.params as Record<string, unknown>) || {},
        reasoning: (s.reasoning as string) || '',
      }));

      return {
        steps,
        finalReply: parsed.finalReply as string | undefined,
        isComplete: steps.length === 0,
      };
    } catch {
      return {
        steps: [],
        finalReply: raw,
        isComplete: true,
      };
    }
  }
}
