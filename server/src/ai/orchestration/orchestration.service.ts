import { Injectable } from '@nestjs/common';
import type { AgentContext, AgentResponse, ExecutedAction } from '../types/agent.types.js';
import type { Plan, PlanStep } from '../types/plan.types.js';
import { PlannerService } from './planner.service.js';
import { ExecutorService } from './executor.service.js';
import { VerifierService } from './verifier.service.js';
import { DeterministicPlannerService } from './deterministic-planner.service.js';
import { ConfirmationPolicy } from '../policies/confirmation.policy.js';
import { AgentStateService } from '../state/agent-state.service.js';
import { PROFILE_UPDATE_PROMPT, SUMMARY_PROMPT, REPLY_SUMMARY_PROMPT } from '../prompts/agent.prompt.js';

const DEFAULT_URL = 'https://api.x.ai/v1/chat/completions';
const DEFAULT_MODEL = 'grok-4.6';
const MAX_CONTEXT_MESSAGES = 20;
const SUMMARY_EVERY_MESSAGES = 6;

@Injectable()
export class OrchestrationService {
  constructor(
    private readonly planner: PlannerService,
    private readonly executor: ExecutorService,
    private readonly verifier: VerifierService,
    private readonly deterministicPlanner: DeterministicPlannerService,
    private readonly confirmationPolicy: ConfirmationPolicy,
    private readonly state: AgentStateService,
  ) {}

  async run(context: AgentContext): Promise<AgentResponse> {
    const session = await this.state.getOrCreateSession(context.userId, context.sessionId);

    if (!context.profile) {
      context.profile = await this.state.getProfile(context.userId);
    }
    context.sessionId = session.id;
    context.summary = session.summary;

    // Resolve any pending confirmation for this user + session BEFORE the planner
    // runs, so "Yes, confirm it" is never sent through the planner as a new request.
    const pending = this.confirmationPolicy.getPending(context.userId, session.id);
    if (pending) {
      const decision = this.classifyConfirmation(context.message);
      if (decision === 'reject' || decision === 'confirm') {
        return this.resolvePending(context, session.id, pending, decision);
      }
      // An unrelated / ambiguous message while a confirmation is pending is not
      // treated as a resolution; fall through to the normal flow below.
    }

    const history = await this.state.getHistory(context.userId, session.id, MAX_CONTEXT_MESSAGES);
    const isFirstMessage = history.length === 0;

    const historyMessages = history.map((m) => ({ role: m.role, content: m.content }));

    // Load the raw tool results (with record IDs) from the previous turn(s) so the
    // planner can resolve follow-up actions like "approve both" against the IDs
    // that were already fetched and surfaced in this conversation.
    const recentToolResults = await this.state.getRecentToolResults(context.userId, session.id);
    const plannerContext = { ...context, sessionId: session.id, recentToolResults };

    // Resolve warden dashboard write actions deterministically FIRST, so
    // "approve them", "approve all pending outings", "approve complaints",
    // "add attendance to Moksha", "mark all present", "add room A101" and
    // "add menu for monday" always produce the correct tool steps instead of
    // relying on the LLM (which may return an empty/wrong plan). Returns null
    // when the message is not such an action, falling through to the LLM planner.
    const deterministicAction = await this.deterministicPlanner.planWardenActionIfApplicable(
      plannerContext,
      context.message,
    );
    if (deterministicAction) {
      console.log(
        `[AGENT PLAN] deterministic-action tools=${deterministicAction.steps.map((s) => s.tool).join(', ') || '(none)'} isComplete=${deterministicAction.isComplete}`,
      );
      return this.runPlan(context, session.id, deterministicAction, context.message, isFirstMessage);
    }

    let plan = await this.planner.createPlan(plannerContext, historyMessages);
    console.log(
      `[AGENT PLAN] tools=${plan.steps.map((s) => s.tool).join(', ') || '(none)'} isComplete=${plan.isComplete}`,
    );

    if (plan.isComplete && !plan.steps.length) {
      // The LLM returned no steps. Before falling back to a canned reply, try the
      // deterministic rule-based planner so common data/action requests never fail
      // just because the model produced an empty plan.
      const fallback = await this.deterministicPlanner.plan(plannerContext, context.message);
      if (fallback) {
        plan = fallback;
        console.log(
          `[AGENT PLAN] deterministic tools=${plan.steps.map((s) => s.tool).join(', ') || '(none)'} isComplete=${plan.isComplete}`,
        );
        if (plan.isComplete && !plan.steps.length) {
          const reply = isFirstMessage
            ? this.maybeGreet(plan.finalReply || 'I can help you with that. Could you provide more details?', context.userName)
            : plan.finalReply || 'I can help you with that. Could you provide more details?';
          await this.state.appendTurn(context.userId, session.id, context.message, reply);
          await this.maybeSummarize(context.userId, session.id);
          await this.maybeUpdateProfile(context.userId, context.message, reply);
          return { reply, sessionId: session.id };
        }
      } else {
        const reply = isFirstMessage
          ? this.maybeGreet(plan.finalReply || 'I can help you with that. Could you provide more details?', context.userName)
          : plan.finalReply || 'I can help you with that. Could you provide more details?';
        await this.state.appendTurn(context.userId, session.id, context.message, reply);
        await this.maybeSummarize(context.userId, session.id);
        await this.maybeUpdateProfile(context.userId, context.message, reply);
        return { reply, sessionId: session.id };
      }
    }

    return this.runPlan(context, session.id, plan, context.message, isFirstMessage);
  }

  /**
   * Runs a ready plan through the confirmation gate, executor and reply summariser,
   * then persists the turn. Shared by the LLM path and the deterministic action
   * path so bulk outing approvals behave identically.
   */
  private async runPlan(
    context: AgentContext,
    sessionId: string,
    plan: Plan,
    message: string,
    isFirstMessage: boolean,
  ): Promise<AgentResponse> {
    const requiresConfirmation = [
      'create_outing',
      'create_complaint',
      'update_attendance',
      'update_complaint_status',
      'update_outing_status',
      'assign_room',
      'mark_attendance',
      'create_room',
      'create_food_menu',
    ];

    const check = this.confirmationPolicy.checkBatch(
      plan.steps,
      context.userId,
      sessionId,
      requiresConfirmation,
    );

    if (check.needsConfirmation && check.confirmationId) {
      const confirmable = plan.steps.filter((s) => requiresConfirmation.includes(s.tool));
      const confirmReply =
        this.confirmationBatchReply(confirmable) ||
        this.confirmationReply(confirmable[0]) ||
        check.summary ||
        `Please confirm: ${plan.steps.map((s) => s.tool).join(', ')}`;
      return {
        reply: isFirstMessage ? this.maybeGreet(confirmReply, context.userName) : confirmReply,
        sessionId,
        actions: [],
        confirmationId: check.confirmationId,
        confirmationSummary: check.summary,
      };
    }

    const actions = await this.executor.executePlan(plan.steps, context);
    await this.persistToolResults(context.userId, sessionId, actions);

    let reply: string;
    if (this.verifier.allSucceeded(actions) && actions.length > 0) {
      // The tools actually executed and returned live data. Summarize that real
      // data into a friendly reply — never fabricating values not in the result.
      const resultText = this.verifier.formatActionResult(actions);
      reply = await this.summarizeResults(resultText, message, context.userName);
    } else if (actions.length > 0) {
      reply = this.friendlyFailure(this.verifier.getFailedAction(actions)?.error);
    } else {
      reply = plan.finalReply || 'I can help you with that. Could you provide more details?';
    }

    if (isFirstMessage) reply = this.maybeGreet(reply, context.userName);

    await this.state.appendTurn(context.userId, sessionId, message, reply);
    await this.maybeSummarize(context.userId, sessionId);
    await this.maybeUpdateProfile(context.userId, message, reply);

    return { reply, sessionId, actions };
  }

  /**
   * Executes or cancels a stored pending confirmation for the authenticated
   * user + session. Re-runs the same policies (permission, validation, safety)
   * through ExecutorService before executing the stored step(s), then persists.
   * Supports batched (bulk) confirmations, e.g. approving several outings at once.
   */
  private async resolvePending(
    context: AgentContext,
    sessionId: string,
    pending: { confirmationId: string; steps: PlanStep[] },
    decision: 'confirm' | 'reject',
  ): Promise<AgentResponse> {
    if (decision === 'reject') {
      this.confirmationPolicy.remove(pending.confirmationId);
      const reply = 'Okay, I have cancelled that action. Let me know if you need anything else.';
      await this.state.appendTurn(context.userId, sessionId, context.message, reply);
      await this.maybeSummarize(context.userId, sessionId);
      return { reply, sessionId, actions: [] };
    }

    // Execute all confirmed steps, then summarize only the real, successful results
    // (or surface the first failure without a generic summary).
    const actions = await this.executor.executePlan(pending.steps, context);
    await this.persistToolResults(context.userId, sessionId, actions);

    this.confirmationPolicy.remove(pending.confirmationId);

    let reply: string;
    if (actions.some((a) => !a.success)) {
      reply = this.friendlyFailure(this.verifier.getFailedAction(actions)?.error);
    } else if (actions.length > 0) {
      // Keep the fixed, natural success message for single create actions
      // (e.g. "Your outing has been successfully created..."), otherwise
      // summarize the real results only (never fabricating values).
      const single = actions.length === 1 ? actions[0] : undefined;
      const fixed = single ? this.confirmationSuccessReply(single.tool) : undefined;
      const resultText = this.verifier.formatActionResult(actions);
      reply = fixed || (await this.summarizeResults(resultText, context.message, context.userName));
    } else {
      reply = 'Done.';
    }

    await this.state.appendTurn(context.userId, sessionId, context.message, reply);
    await this.maybeSummarize(context.userId, sessionId);
    await this.maybeUpdateProfile(context.userId, context.message, reply);

    return { reply, sessionId, actions };
  }

  /**
   * Builds a human-readable confirmation message for a BATCH of steps (e.g. bulk
   * outing approvals). Lists every target so the warden sees exactly what will be
   * done before confirming. Falls back to undefined (so the caller can use the
   * per-step reply or generic summary) when the steps are not a homogeneous batch.
   */
  private confirmationBatchReply(steps: PlanStep[]): string | undefined {
    if (steps.length <= 1) return undefined;

    const allOutings = steps.every((s) => s.tool === 'update_outing_status');
    if (allOutings) {
      const status = String(steps[0].params.status || '').toLowerCase();
      const verb = status === 'rejected' ? 'reject' : 'approve';
      const ids = steps.map((s) => s.params.outingId).join(', ');
      return [
        `I'm about to ${verb} outing requests #${ids}.`,
        '',
        'Would you like me to confirm this?',
      ].join('\n');
    }

    // Bulk attendance marking ("mark all present") targets every student.
    if (steps.every((s) => s.tool === 'mark_attendance')) {
      const status = String(steps[0].params.status || '').toLowerCase();
      const date = String(steps[0].params.date || '');
      const count = steps.length;
      return [
        `I'm about to mark ${status} attendance for ${count} student${count === 1 ? '' : 's'}${date ? ` on ${date}` : ''}.`,
        '',
        'Would you like me to confirm this?',
      ].join('\n');
    }

    // Bulk complaint updates ("approve complaints") target every pending one.
    if (steps.every((s) => s.tool === 'update_complaint_status')) {
      const status = String(steps[0].params.status || '').toLowerCase();
      const ids = steps.length === 1 ? `#${steps[0].params.complaintId}` : `for ${steps.length} complaints`;
      return [
        `I'm about to mark ${status} on ${ids}.`,
        '',
        'Would you like me to confirm this?',
      ].join('\n');
    }

    return undefined;
  }

  /**
   * Builds a friendly, human-readable confirmation message for a pending
   * action. Falls back to the generic summary when the tool is unknown.
   */
  private confirmationReply(step: PlanStep): string | undefined {
    if (step.tool === 'create_outing') {
      const p = (step.params || {}) as Record<string, string>;
      const lines = ['Your outing request is ready:', ''];
      if (p.destination) lines.push(`Destination: ${p.destination}`);
      if (p.reason) lines.push(`Reason: ${p.reason}`);
      if (p.outingDate) lines.push(`Date: ${p.outingDate}`);
      if (p.outTime || p.inTime) {
        lines.push(`Time: ${p.outTime ?? '?'} - ${p.inTime ?? '?'}`);
      }
      lines.push('', 'Would you like me to confirm it?');
      return lines.join('\n');
    }

    if (step.tool === 'create_complaint') {
      const p = (step.params || {}) as Record<string, string>;
      const title = p.title || 'your complaint';
      const desc = p.description;
      const lines = [`I'm about to file this complaint: ${title}`];
      if (desc) lines.push(`Details: ${desc}`);
      lines.push('', 'Would you like me to confirm it?');
      return lines.join('\n');
    }

    if (step.tool === 'update_outing_status') {
      const p = (step.params || {}) as Record<string, string>;
      const outingId = p.outingId;
      const status = p.status;
      const action = String(status || '').toLowerCase() === 'approved' ? 'approve' : 'reject';
      const lines = [`I'm about to ${action} outing request #${outingId}.`];
      lines.push('', 'Would you like me to confirm it?');
      return lines.join('\n');
    }

    if (step.tool === 'assign_room') {
      const p = (step.params || {}) as Record<string, string | number>;
      const lines = [`I'm about to assign room (roomId ${p.roomId}) to student #${p.studentId}.`];
      lines.push('', 'Would you like me to confirm it?');
      return lines.join('\n');
    }

    if (step.tool === 'update_complaint_status') {
      const p = (step.params || {}) as Record<string, string | number>;
      const status = String(p.status || '').toLowerCase();
      const lines = [`I'm about to mark complaint #${p.complaintId} as ${status}.`];
      lines.push('', 'Would you like me to confirm it?');
      return lines.join('\n');
    }

    if (step.tool === 'mark_attendance') {
      const p = (step.params || {}) as Record<string, string | number>;
      const lines = [`I'm about to mark ${p.status} attendance for student #${p.studentId} on ${p.date}.`];
      lines.push('', 'Would you like me to confirm it?');
      return lines.join('\n');
    }

    if (step.tool === 'create_room') {
      const p = (step.params || {}) as Record<string, string | number>;
      const lines = [
        `I'm about to add room ${p.roomNumber} (block ${p.block}, floor ${p.floor}, capacity ${p.capacity}).`,
      ];
      lines.push('', 'Would you like me to confirm it?');
      return lines.join('\n');
    }

    if (step.tool === 'create_food_menu') {
      const p = (step.params || {}) as Record<string, string | number>;
      const lines = [`I'm about to publish the food menu for ${p.day}.`];
      lines.push('', 'Would you like me to confirm it?');
      return lines.join('\n');
    }

    return undefined;
  }

  /**
   * Classifies a user message as a confirmation, a rejection, or neither.
   */
  private classifyConfirmation(message: string): 'confirm' | 'reject' | undefined {
    const normalized = (message || '').toLowerCase().trim();

    const isReject =
      /(^|\b)(no|cancel|reject|decline|stop|nope|dont|don't|never mind|forget it|abort)(\b|$)/.test(
        normalized,
      );
    if (isReject) return 'reject';

    const isConfirm =
      /(^|\b)(yes|yeah|yep|confirm|approve|go ahead|proceed|sure|ok|okay|do it|go on)(\b|$)/.test(
        normalized,
      );
    if (isConfirm) return 'confirm';

    return undefined;
  }

  async handleConfirmation(confirmationId: string, approved: boolean, userId: number): Promise<AgentResponse | null> {
    const steps = this.confirmationPolicy.resolve(confirmationId, approved, userId);
    if (!steps) return null;

    if (!approved) {
      return { reply: 'Action cancelled.', sessionId: '' };
    }

    const context: AgentContext = {
      userId,
      sessionId: '',
      role: 'student',
      message: '',
      profile: '',
      summary: '',
    };
    const actions = await this.executor.executePlan(steps, context);
    const resultText = this.verifier.formatActionResult(actions);
    const anyFailed = actions.some((a) => !a.success);
    const reply = anyFailed
      ? `Failed: ${this.verifier.getFailedAction(actions)?.error}`
      : `Done! ${resultText}`;
    return { reply, sessionId: '', actions };
  }

  /**
   * Persists the raw, successful tool results (with record IDs intact) from the
   * executed actions as conversation context. This is what makes follow-up
   * actions like "approve both" possible on the NEXT turn: the planner receives
   * these IDs even though the user-facing reply strips them out.
   */
  private async persistToolResults(
    userId: number,
    sessionId: string,
    actions: ExecutedAction[],
  ): Promise<void> {
    const parts: string[] = [];
    for (const action of actions) {
      if (!action.success) continue;
      const tool = action.tool;
      const data = action.result;
      let rendered = '';
      try {
        rendered = JSON.stringify(data) ?? '';
      } catch {
        rendered = String(data ?? '');
      }
      if (!rendered || rendered === '{}' || rendered === '[]') continue;
      parts.push(`${tool}: ${rendered}`);
    }
    if (parts.length) {
      await this.state.appendToolContext(userId, sessionId, parts.join('\n'));
    }
  }

  /**
   * Fixed, human-readable success reply for a confirmed create action. Using a
   * hardcoded message (never the raw tool result) keeps internal IDs and status
   * codes out of the chat while saying exactly what happened.
   */
  private confirmationSuccessReply(tool: string): string | undefined {
    if (tool === 'create_outing') {
      return 'Your outing has been successfully created and is currently pending approval.';
    }
    if (tool === 'create_complaint') {
      return 'Your complaint has been filed successfully. We will look into it.';
    }
    return undefined;
  }

  /**
   * Prepends a short greeting on the very first message of a session. Skips it
   * when the reply already opens with a greeting or no real name is available.
   */
  private maybeGreet(reply: string, userName?: string): string {
    if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/i.test(reply.trim())) return reply;
    const first = (userName || '').trim().split(/\s+/)[0];
    if (!first) return reply;
    return `Hi ${first}! ${reply}`;
  }

  private async maybeSummarize(userId: number, sessionId: string): Promise<void> {
    const count = await this.state.countMessages(userId, sessionId);
    if (count < SUMMARY_EVERY_MESSAGES) return;

    const recent = await this.state.getHistory(userId, sessionId, SUMMARY_EVERY_MESSAGES);
    const transcript = recent.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

    try {
      const summary = await this.llmText(SUMMARY_PROMPT, transcript);
      await this.state.setSummary(userId, sessionId, summary);
    } catch {}
  }

  private async maybeUpdateProfile(userId: number, userMessage: string, assistantMessage: string): Promise<void> {
    try {
      const profile = await this.state.getProfile(userId);
      const merged = await this.llmText(
        PROFILE_UPDATE_PROMPT,
        `Existing profile: ${profile || '(empty)'}\n\nLatest exchange:\nUser: ${userMessage}\nAssistant: ${assistantMessage}`,
      );
      await this.state.setProfile(userId, merged);
    } catch {}
  }

  /**
   * Turns the actual tool results into a friendly, natural-language reply.
   * Never invents data — it only restates what the executed tools returned.
   * Falls back to a readable rendering if the LLM call fails.
   */
  private async summarizeResults(
    resultText: string,
    _userMessage: string,
    userName?: string,
  ): Promise<string> {
    const prompt = REPLY_SUMMARY_PROMPT.replace('{results}', resultText).replace(
      '{userName}',
      (userName || '').trim() || 'the user',
    );
    const reply = await this.llmText(prompt, 'Write the friendly reply now.', 700);
    if (reply) return reply;

    // Fallback: render the real data as plain text, never as raw JSON.
    return this.readableFallback(resultText);
  }

  private readableFallback(resultText: string): string {
    const blocks = resultText.split(/Tool \S+ executed successfully\.?\s*/).filter(Boolean);
    if (blocks.length === 0) return 'Done';

    const lines: string[] = [];
    for (const block of blocks) {
      const cleaned = block.replace(/^\s*Result:\s*/i, '').trim();
      if (!cleaned) continue;

      let text = cleaned;
      try {
        const parsed = JSON.parse(cleaned);
        const rendered = this.renderRecords(parsed);
        text = rendered || 'No data found.';
      } catch {
        // Already plain text — keep it as-is.
      }
      lines.push(text);
    }
    return lines.filter(Boolean).join('\n');
  }

  private renderRecords(value: unknown): string {
    if (Array.isArray(value)) {
      if (value.length === 0) return 'No records found.';
      return value
        .map((r, i) => `\n- ${this.renderRecord(r)}`)
        .join('');
    }
    if (value && typeof value === 'object') {
      return this.renderRecord(value as Record<string, unknown>);
    }
    return String(value);
  }

  /**
   * Renders a single tool record as a short, human-oriented, natural-language
   * line (e.g. "Rahul — Bhimavaram, Sep 1, 10:00–18:00 (Approved)"). This is the
   * deterministic fallback shown when the LLM summariser is unavailable, so it is
   * written to be genuinely readable rather than a raw dump of every DB field.
   */
  private renderRecord(record: unknown): string {
    if (!record || typeof record !== 'object') return String(record ?? 'No data');
    const obj = record as Record<string, unknown>;
    const nested = (k: string): Record<string, unknown> | null =>
      obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])
        ? (obj[k] as Record<string, unknown>)
        : null;

    const studentName =
      (obj['studentName'] as string) ||
      (nested('student')?.['name'] as string) ||
      (nested('user')?.['name'] as string);

    // Outing / outing request.
    if ('outingDate' in obj || 'destination' in obj) {
      const parts: string[] = [];
      const id = obj['id'];
      if (id != null) parts.push(`#${id}`);
      if (studentName) parts.push(studentName);
      const destination = obj['destination'];
      if (destination) parts.push(String(destination));
      const date = this.formatDate(obj['outingDate'] as string);
      if (date) parts.push(date);
      const out = obj['outTime'];
      const inn = obj['inTime'];
      if (out || inn) parts.push(`${out ?? '?'}-${inn ?? '?'}`);
      const status = obj['status'];
      if (status) parts.push(`(${status})`);
      return parts.join(' ');
    }

    // Complaint.
    if ('title' in obj || 'description' in obj || 'complaint' in obj) {
      const parts: string[] = [];
      const id = obj['id'];
      if (id != null) parts.push(`#${id}`);
      if (studentName) parts.push(studentName);
      const title = obj['title'] ?? obj['complaint'];
      if (title) parts.push(`- ${title}`);
      const status = obj['status'];
      if (status) parts.push(`(${status})`);
      return parts.join(' ').trim();
    }

    // Student.
    if ('rollNumber' in obj || 'branch' in obj) {
      const parts: string[] = [];
      const id = obj['id'];
      if (id != null) parts.push(`#${id}`);
      const name = studentName || (obj['name'] as string);
      if (name) parts.push(String(name));
      const roll = obj['rollNumber'];
      if (roll) parts.push(`(${roll})`);
      const branch = obj['branch'] as string | undefined;
      const year = obj['year'];
      if (branch) parts.push(`, ${branch}`);
      if (year != null) parts.push(`Year ${year}`);
      const email = (nested('user')?.['email'] as string) || (obj['email'] as string);
      if (email) parts.push(`<${email}>`);
      const roomObj = nested('room');
      const roomNo = (obj['roomNumber'] as string) ?? (roomObj?.['roomNumber'] as string);
      if (roomNo) {
        const block = (obj['block'] as string) ?? (roomObj?.['block'] as string);
        const floor = (obj['floor'] as unknown) ?? (roomObj?.['floor'] as unknown);
        let roomStr = `Room ${roomNo}`;
        if (block) roomStr += ` Block ${block}`;
        if (floor != null) roomStr += ` Floor ${floor}`;
        const cap = (roomObj?.['capacity'] as unknown) ?? (obj['capacity'] as unknown);
        const occ = (roomObj?.['occupied'] as unknown) ?? (obj['occupied'] as unknown);
        if (cap != null && occ != null) roomStr += ` (${occ}/${cap})`;
        parts.push(`- ${roomStr}`);
      } else if (roomObj) {
        // fallback if room object exists but no number
        parts.push(`- Room ${JSON.stringify(roomObj)}`);
      }
      return parts.filter(Boolean).join(' ');
    }

    // Room.
    if ('roomNumber' in obj || 'room' in obj) {
      const roomNo = obj['roomNumber'] ?? (nested('room')?.['roomNumber']);
      const block = obj['block'] ?? (nested('room')?.['block']);
      const parts: string[] = [];
      if (roomNo) parts.push(`Room ${roomNo}`);
      if (block) parts.push(`(Block ${block})`);
      const floor = obj['floor'] ?? (nested('room')?.['floor']);
      if (floor) parts.push(`Floor ${floor}`);
      const occ = obj['occupied'];
      const cap = obj['capacity'];
      if (occ != null && cap != null) parts.push(`${occ}/${cap} occupied`);
      const occupants = obj['occupants'];
      if (Array.isArray(occupants)) {
        if (occupants.length) {
          const names = occupants
            .map((o) => {
              const n = this.nameOf(o);
              const roll = (o as Record<string, unknown>)['rollNumber'];
              return roll ? `${n} (${roll})` : n;
            })
            .filter(Boolean)
            .join(', ');
          parts.push(`staying: ${names}`);
        } else {
          parts.push('empty (no occupants)');
        }
      }
      return parts.join(' ');
    }

    // Attendance.
    if ('status' in obj && 'date' in obj) {
      const str = obj['status'];
      const date = this.formatDate(obj['date'] as string);
      const who = studentName ? `${studentName}: ` : '';
      return `${who}${str ? String(str) : 'present'}${date ? ` on ${date}` : ''}`;
    }

    // Generic fallback: keep only top-level scalar fields, skip internal ids.
    const parts: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'object') continue;
      if (['id', 'studentId', 'userId', 'roomId'].includes(k)) continue;
      parts.push(`${this.label(k)}: ${v}`);
    }
    return parts.join(' | ');
  }

  private nameOf(value: unknown): string {
    if (!value || typeof value !== 'object') return String(value ?? '');
    const o = value as Record<string, unknown>;
    return (o['name'] as string) || (o['studentName'] as string) || '';
  }

  private formatDate(value: unknown): string {
    if (!value) return '';
    const s = String(value);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return s;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mon = months[Number(m[2]) - 1] || m[2];
    return `${m[3]} ${mon} ${m[1]}`;
  }

  private label(key: string): string {
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .toLowerCase();
  }

  private async llmText(systemPrompt: string, userContent: string, maxTokens = 200): Promise<string> {    const apiKey = process.env['XAI_API_KEY'];
    if (!apiKey) return '';
    const model = process.env['XAI_MODEL'] || DEFAULT_MODEL;
    const url = process.env['XAI_URL'] || DEFAULT_URL;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: maxTokens,
      }),
    });

    if (!res.ok) return '';
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  /**
   * Renders a failed action into a friendly, non-technical reply. Permission
   * denials (enforced by PermissionPolicy) get a natural message; everything
   * else gets a generic "could not complete" message.
   */
  private friendlyFailure(error: string | undefined): string {
    const msg = (error || '').toLowerCase();
    if (msg.includes('permission')) {
      return "Sorry, you don't have permission to view that. If you think this is a mistake, please contact the warden.";
    }
    if (error && (msg.includes('already') || msg.includes('not found') || msg.includes('invalid outing'))) {
      return error;
    }
    return `I could not complete that. Please try again.`;
  }
}
