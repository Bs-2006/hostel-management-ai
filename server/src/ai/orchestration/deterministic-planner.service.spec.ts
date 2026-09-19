import { DeterministicPlannerService } from './deterministic-planner.service.js';
import { ToolRegistry } from '../tools/tool.registry.js';
import { PermissionPolicy } from '../policies/permission.policy.js';
import type { AgentContext } from '../types/agent.types.js';

describe('DeterministicPlannerService — outing approvals', () => {
  const PENDING = [
    { id: 5, destination: 'Home', status: 'Pending', student: { id: 1, name: 'Moksha' } },
    { id: 6, destination: 'Temple', status: 'Pending', student: { id: 2, name: 'Ravi' } },
    { id: 7, destination: 'Market', status: 'Pending', student: { id: 3, name: 'Anil' } },
  ];

  let service: DeterministicPlannerService;
  let registry: ToolRegistry;

  const wardenContext = (overrides: Partial<AgentContext> = {}): AgentContext => ({
    userId: 1,
    sessionId: 'sess-x',
    role: 'warden',
    message: 'approve them',
    profile: '',
    summary: '',
    recentToolResults: `get_all_outing_requests: ${JSON.stringify(PENDING)}`,
    ...overrides,
  });

  beforeEach(() => {
    registry = new ToolRegistry();
    registry.register({
      definition: {
        name: 'get_all_outing_requests',
        description: 'fetch',
        parameters: [],
      },
      async execute(params: Record<string, unknown>) {
        const status = params.status as string | undefined;
        const rows = status && status !== 'Pending' ? [] : PENDING;
        return { success: true, data: rows };
      },
    } as any);

    const permission = new PermissionPolicy();
    service = new DeterministicPlannerService(registry as any, permission);
  });

  it('approves all pending outings for "Approve them" using conversation context', async () => {
    const ctx = wardenContext({ message: 'Approve them' });
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).not.toBeNull();
    expect(plan!.steps.map((s) => s.params.outingId)).toEqual([5, 6, 7]);
    expect(plan!.steps.every((s) => s.params.status === 'Approved')).toBe(true);
  });

  it('approves all pending outings for "approve all pending outings"', async () => {
    const ctx = wardenContext({ message: 'approve all pending outings' });
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).not.toBeNull();
    expect(plan!.steps.map((s) => s.params.outingId)).toEqual([5, 6, 7]);
  });

  it('rejects all pending outings for "reject all of them"', async () => {
    const ctx = wardenContext({ message: 'reject all of them' });
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).not.toBeNull();
    expect(plan!.steps.map((s) => s.params.outingId)).toEqual([5, 6, 7]);
    expect(plan!.steps.every((s) => s.params.status === 'Rejected')).toBe(true);
  });

  it('approves only the matching student for a bare name "Moksha"', async () => {
    const ctx = wardenContext({ message: 'Moksha' });
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(1);
    expect(plan!.steps[0].params.outingId).toBe(5);
    expect(plan!.steps[0].params.status).toBe('Approved');
  });

  it('approves only the named student for "approve Moksha\'s outing"', async () => {
    const ctx = wardenContext({ message: "Approve Moksha's outing" });
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(1);
    expect(plan!.steps[0].params.outingId).toBe(5);
  });

  it('approves only the named student for "approve Moksha\'s pending outings"', async () => {
    const ctx = wardenContext({ message: "Approve Moksha's pending outings" });
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(1);
    expect(plan!.steps[0].params.outingId).toBe(5);
  });

  it('approves the first pending outing for "Approve the first one"', async () => {
    const ctx = wardenContext({ message: 'Approve the first one' });
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(1);
    expect(plan!.steps[0].params.outingId).toBe(5);
  });

  it('rejects the second pending outing for "Reject the second one"', async () => {
    const ctx = wardenContext({ message: 'Reject the second one' });
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(1);
    expect(plan!.steps[0].params.outingId).toBe(6);
    expect(plan!.steps[0].params.status).toBe('Rejected');
  });

  it('rejects the third pending outing for "Reject the third"', async () => {
    const ctx = wardenContext({ message: 'Reject the third' });
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(1);
    expect(plan!.steps[0].params.outingId).toBe(7);
  });

  it('asks which two instead of the student name when "both" spans 3+ outings', async () => {
    const ctx = wardenContext({ message: 'Approve both' });
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(0);
    expect(plan!.finalReply).toMatch(/both|which two/);
  });

  it('approves both pending outings when exactly two are pending', async () => {
    const two = PENDING.slice(0, 2);
    registry.register({
      definition: { name: 'get_all_outing_requests', description: 'fetch', parameters: [] },
      async execute() {
        return { success: true, data: two };
      },
    } as any);
    const ctx = { ...wardenContext({ message: 'Approve both' }), recentToolResults: `get_all_outing_requests: ${JSON.stringify(two)}` };
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).not.toBeNull();
    expect(plan!.steps.map((s) => s.params.outingId)).toEqual([5, 6]);
  });

  it('treats "approve outings" / "approve the outings" as bulk approve-all', async () => {
    for (const msg of ['approve outings', 'approve the outings', 'approve pending outings']) {
      const ctx = wardenContext({ message: msg });
      const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
      expect(plan).not.toBeNull();
      expect(plan!.steps.map((s) => s.params.outingId)).toEqual([5, 6, 7]);
    }
  });

  it('does NOT treat "approve pending outings" as a student name', async () => {
    const ctx = wardenContext({ message: 'approve pending outings' });
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).not.toBeNull();
    expect(plan!.steps.map((s) => s.params.outingId)).toEqual([5, 6, 7]);
  });

  it('resolves a bare student name "Moksha" even with NO prior tool context', async () => {
    const ctx = wardenContext({ message: 'Moksha', recentToolResults: '' });
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(1);
    expect(plan!.steps[0].params.outingId).toBe(5);
  });

  it('does NOT intercept greetings or view requests as outing approvals', async () => {
    for (const msg of ['Hi', 'Hello', 'Good morning', 'show me outings', 'list pending outings', 'show details']) {
      const ctx = wardenContext({ message: msg });
      expect(await service.planOutingActionIfApplicable(ctx, ctx.message)).toBeNull();
    }
  });

  it('does NOT treat a view request "show me all outings" as an approval', async () => {
    const ctx = wardenContext({ message: 'show me all outings' });
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).toBeNull();
  });

  it('reports a helpful message when a named student has no pending outing', async () => {
    const ctx = wardenContext({ message: 'Naveen' });
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(0);
    expect(plan!.finalReply).toContain('Naveen');
  });

  it('resolves bulk approvals from the DB when there is no prior tool context', async () => {
    const ctx = wardenContext({ message: 'approve all pending outings', recentToolResults: '' });
    const plan = await service.planOutingActionIfApplicable(ctx, ctx.message);
    expect(plan).not.toBeNull();
    expect(plan!.steps.map((s) => s.params.outingId)).toEqual([5, 6, 7]);
  });
});
