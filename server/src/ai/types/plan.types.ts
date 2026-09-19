export interface PlanStep {
  id: number;
  tool: string;
  params: Record<string, unknown>;
  reasoning: string;
}

export interface Plan {
  steps: PlanStep[];
  finalReply?: string;
  isComplete: boolean;
}
