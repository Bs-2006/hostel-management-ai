import { Injectable } from '@nestjs/common';
import type { AgentContext } from '../types/agent.types.js';
import type { Plan, PlanStep } from '../types/plan.types.js';
import type { ToolResult } from '../types/tool.types.js';
import { ToolRegistry } from '../tools/tool.registry.js';
import { PermissionPolicy } from '../policies/permission.policy.js';

/**
 * Deterministic, rule-based fallback planner. It is used as a safety net when the
 * LLM returns an empty/unreliable plan, so common warden/student requests never
 * degrade to a generic "Sorry, I could not process your request" just because the
 * model happened to produce no steps. It is role-aware and only proposes steps the
 * authenticated role is permitted to run (verified via PermissionPolicy), so it
 * never bypasses authorization. For writes ("approve/reject <person>" ) it resolves
 * the target record by the person's name through real DB data instead of demanding
 * an opaque numeric ID from the user.
 */
@Injectable()
export class DeterministicPlannerService {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly permissionPolicy: PermissionPolicy,
  ) {}

  async plan(context: AgentContext, message: string): Promise<Plan | null> {
    const role = String(context.role || '').trim().toUpperCase();
    const own = role !== 'WARDEN';
    const text = message.toLowerCase();

    const step = (tool: string, params: Record<string, unknown>, reasoning: string): PlanStep => ({
      id: 0,
      tool,
      params,
      reasoning,
    });

    const push = (s: PlanStep): Plan | null => {
      if (!this.allowed(context, s.tool)) return null;
      return { steps: [s], isComplete: false };
    };

    // --- Approve / reject outing requests (WARDEN). Handles explicit verbs
    // ("approve them", "reject #5"), bulk references ("approve all pending outings"),
    // and bare student names ("Moksha") resolved against pending outings. ---
    const outingIntent = this.outingIntent(context, message);
    if (outingIntent === 'approve' || outingIntent === 'reject') {
      const action = await this.planOutingAction(context, message, outingIntent === 'reject');
      if (action) return action;
    }
    // If the user only typed a bare student name while pending outings are in
    // context, treat it as "approve that student's outing" (context-aware).
    if (this.isBareStudentName(message, context)) {
      const action = await this.planOutingAction(context, message, false);
      if (action) return action;
    }

    // --- Food menu ---
    if (text.includes('menu') || (text.includes('food') && !text.includes('outing'))) {
      if (text.includes('week')) return push(step('get_food_menu_week', {}, 'Weekly food menu'));
      return push(step('get_food_menu', {}, 'Food menu'));
    }

    // --- Book / request an outing (CREATE intent: ask for details, never list) ---
    if (this.hasCreateIntent(text, /\b(outing|leave|out[ -]?pass)\b/)) {
      return {
        steps: [],
        isComplete: true,
        finalReply:
          "I'd be happy to help you book an outing. Please tell me: (1) your destination, (2) the reason for the outing, (3) the date (e.g. 2026-09-02), (4) the time you'll leave, and (5) the time you expect to return.",
      };
    }

    // --- File a complaint (CREATE intent: ask for details, never list) ---
    if (this.hasCreateIntent(text, /\b(complaint|grievance)\b/)) {
      return {
        steps: [],
        isComplete: true,
        finalReply:
          "I'd be happy to help you file a complaint. Please tell me a short title for the complaint and a description of the problem.",
      };
    }

    // --- Outings / leave ---
    if (text.includes('outing') || text.includes('leave') || text.includes('out pass') || text.includes('outing request')) {
      if (own) return push(step('get_my_outings', {}, 'My outings'));
      const params: Record<string, unknown> = {};
      if (text.includes('pending') || text.includes('awaiting') || text.includes('approve')) params.status = 'Pending';
      if (text.includes('approved')) params.status = 'Approved';
      if (text.includes('rejected') || text.includes('denied')) params.status = 'Rejected';
      return push(step('get_all_outing_requests', params, 'All outing requests'));
    }

    // --- Attendance ---
    if (text.includes('attendance') || text.includes('present') || text.includes('absent')) {
      if (own) return push(step('get_my_attendance', {}, 'My attendance'));
      const params: Record<string, unknown> = {};
      if (text.includes('absent')) params.status = 'ABSENT';
      else if (text.includes('present')) params.status = 'PRESENT';
      if (text.includes('today')) params.date = this.today();
      else if (text.includes('yesterday')) {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        params.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else {
        const dm = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
        if (dm) params.date = dm[1];
      }
      return push(step('get_all_attendance', params, 'All attendance'));
    }

    // --- Complaints ---
    if (text.includes('complaint')) {
      if (own) return push(step('get_my_complaints', {}, 'My complaints'));
      const params: Record<string, unknown> = {};
      if (text.includes('pending')) params.status = 'PENDING';
      else if (text.includes('in progress') || text.includes('processing')) params.status = 'IN_PROGRESS';
      else if (text.includes('resolved')) params.status = 'RESOLVED';
      return push(step('get_all_complaints', params, 'All complaints'));
    }

    // --- Rooms ---
    if (text.includes('room')) {
      if (text.includes('my room')) return push(step('get_my_room', {}, 'My room'));
      if (text.includes('available') || text.includes('empty') || text.includes('free') || text.includes('vacant')) {
        return push(step('get_available_rooms', {}, 'Available rooms'));
      }
      const roomMatch = message.match(/\broom\s+([a-z0-9-]+)/i) || message.match(/\b([a-z0-9-]+)\s+room\b/i);
      if (roomMatch) return push(step('get_room_details', { roomNumber: roomMatch[1] }, 'Room details'));
      return push(step('get_all_rooms', {}, 'All rooms'));
    }

    // --- Students (warden only) ---
    if (text.includes('student') && !own) {
      return push(step('get_all_students', {}, 'All students'));
    }

    return null;
  }

  /**
   * True when the message clearly expresses the intent to CREATE a new record
   * (e.g. "book an outing", "file a complaint") rather than view existing ones.
   */
  private hasCreateIntent(text: string, noun: RegExp): boolean {
    const viewDeny =
      /\b(show|list|view|check|see|display|status|history|pending|approved|rejected|denied|issued|my|your|all|summary|requests?|count)\b/.test(
        text,
      );
    if (viewDeny) return false;

    const verb = /\b(book|apply|schedule|plan|create|request|file|register|submit|log|raise|make|want|need)\b/.test(
      text,
    );
    return verb && noun.test(text);
  }

  /**
   * Public, LLM-independent resolver for warden outing approve/reject actions. Called
   * by the orchestrator BEFORE the LLM planner so that commands like "approve them",
   * "approve all pending outings", or a bare student name ("Moksha") are always
   * turned into the correct update_outing_status steps — never an empty plan or a
   * clarifying question. Returns null when the message is not such an action.
   */
  async planOutingActionIfApplicable(context: AgentContext, message: string): Promise<Plan | null> {
    const role = String(context.role || '').trim().toUpperCase();
    const intent = this.outingIntent(context, message);
    if (intent === 'approve' || intent === 'reject') {
      return this.planOutingAction(context, message, intent === 'reject');
    }
    // A bare student name ("Moksha") in an outing-approval context. For the warden
    // this resolves against the stored pending outings OR the live DB, so it never
    // degrades to the (slow/unreliable) LLM planner. Only a single capitalized word
    // is treated as a bare name (so "Good morning", "Hi", "show me details" and
    // other normal phrases are excluded); greetings/utility words are rejected by
    // isPlausibleName.
    const trimmed = message.trim();
    const isView = /^\s*(show|list|view|display|see|check|what|get|tell|give|details)/i.test(trimmed);
    const isSingleName =
      /^[A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)?$/.test(trimmed) && this.isPlausibleName(trimmed);
    if (role === 'WARDEN' && !isView && isSingleName) {
      return this.planOutingAction(context, message, false);
    }
    // Bare bulk words like "all" after listing pending outings should bulk-approve.
    const lowerTrim = trimmed.toLowerCase();
    const isBareBulk =
      /^(all|them|those|these|both|everyone|every)$/i.test(trimmed) ||
      /^all(\s+(pending\s+)?(requests?|outings?))?$/i.test(lowerTrim);
    if (role === 'WARDEN' && !isView && isBareBulk && this.hasPendingOutingContext(context)) {
      return this.planOutingAction(context, message, false);
    }
    return null;
  }

  /**
   * Public, LLM-independent resolver for ALL warden dashboard rewrite actions,
   * not only outing approvals. Dispatches by message keyword:
   *   - complaints ("approve/reject complaints", "...Moksha's complaint")
   *   - attendance ("add attendance to Moksha", "mark all present/absent")
   *   - rooms      ("add room A101 in block B floor 2 capacity 4")
   *   - food menu  ("add menu for Monday ...")
   * Anything not matched falls through to the outing resolver, so existing
   * outing approve/reject behavior is unchanged. Returns null when the message
   * is not a deterministic warden action (the LLM planner then handles it).
   */
  async planWardenActionIfApplicable(context: AgentContext, message: string): Promise<Plan | null> {
    const role = String(context.role || '').trim().toUpperCase();
    if (role !== 'WARDEN') return null;

    const complaintPlan = await this.planComplaintAction(context, message);
    if (complaintPlan) return complaintPlan;

    const attendancePlan = await this.planAttendanceAction(context, message);
    if (attendancePlan) return attendancePlan;

    const roomPlan = await this.planRoomAction(context, message);
    if (roomPlan) return roomPlan;

    const menuPlan = await this.planMenuAction(context, message);
    if (menuPlan) return menuPlan;

    return this.planOutingActionIfApplicable(context, message);
  }

  /**
   * Complaint status resolution (WARDEN). "approve/accept/resolve/close" ->
   * RESOLVED, "reject/deny/dismiss" -> REJECTED, "in progress" ->
   * IN_PROGRESS. Targets explicit complaint IDs, a named student's pending
   * complaints, or all pending complaints (bulk). View/create messages are
   * never treated as status updates (returns null).
   */
  private async planComplaintAction(context: AgentContext, message: string): Promise<Plan | null> {
    const text = message.toLowerCase().trim();
    if (!/\b(complaint|complaints|grievance)\b/.test(text)) return null;

    // A request to VIEW or FILE complaints is not a status update.
    const isView = /\b(show|list|view|display|see|check|what|get|count|total)\b/.test(text);
    const isCreate = /\b(file|make|raise|register|submit|log|add|new|report)\b/.test(text);
    if (isView || isCreate) return null;

    let status: string | null = null;
    if (/\b(reject\w*|deny\w*|declin\w*|dismiss\w*)\b/.test(text)) status = 'REJECTED';
    else if (/\b(in progress|working on|processing|investigat\w*|started)\b/.test(text)) status = 'IN_PROGRESS';
    else if (/\b(approv\w*|accept\w*|resolv\w*|clos\w*|fix\w*|solv\w*|complet\w*)\b/.test(text)) status = 'RESOLVED';
    if (!status) return null;

    const makeSteps = (ids: number[]): Plan => ({
      steps: ids.map((id) => ({
        id: 0,
        tool: 'update_complaint_status',
        params: { complaintId: id, status },
        reasoning: `Mark complaint #${id} as ${status}`,
      })),
      isComplete: false,
    });

    const explicitIds = this.parseExplicitIds(message.replace(/\b(complaint|complaints)\b/gi, ''));
    if (explicitIds.length) return makeSteps(explicitIds);

    const complaints = await this.fetchPendingComplaints(context);
    const personName = this.extractPersonName(message, true);
    const name = this.isPlausibleName(personName) ? personName : null;

    // Bare plural references ("approve complaints", "resolve grievances") or an
    // explicit bulk word mean "all pending complaints". A singular named target
    // ("reject Moksha's complaint") is resolved by name above.
    const isBulk =
      !name &&
      (
        /\b(all|them|these|those|every|everyone|everybody)\b/.test(text) ||
        /\b(complaints|grievances)\b/.test(text)
      );
    if (isBulk) {
      if (!complaints.length) {
        return {
          steps: [],
          isComplete: true,
          finalReply: 'There are no pending complaints to update right now.',
        };
      }
      return makeSteps(complaints.map((c) => c.id));
    }

    if (name) {
      const ids = complaints
        .filter((c) => {
          const n = (c?.student?.user?.name || c?.student?.name) as string | undefined;
          return typeof n === 'string' && n.toLowerCase().includes(name.toLowerCase());
        })
        .map((c) => c.id);
      if (ids.length) return makeSteps(ids);
      return {
        steps: [],
        isComplete: true,
        finalReply: `I couldn\u2019t find a pending complaint from ${name}.`,
      };
    }

    return {
      steps: [],
      isComplete: true,
      finalReply: 'Please tell me which complaint to update, for example "approve complaints" or "reject complaint #5".',
    };
  }

  /**
   * Attendance marking resolution (WARDEN). "add/mark attendance for <name> or
   * all", "mark everyone present/absent". Resolves student IDs from live data
   * (or a student already shown in the conversation). Defaults: today's date,
   * status PRESENT unless the message says absent.
   */
  private async planAttendanceAction(context: AgentContext, message: string): Promise<Plan | null> {
    const text = message.toLowerCase().trim();

    const markVerb = /\b(mark|add|record|save|update|take|log)\b/.test(text);
    const hasDomain = /\battendance\b/.test(text) || (/\b(present|absent)\b/.test(text) && markVerb);
    if (!hasDomain) return null;

    // "show/list attendance" and "who is absent" are view requests, not actions.
    const isView = /\b(show|list|view|display|see|check|what|get|count|how many|who|whose|summary)\b/.test(text);
    if (isView) return null;

    const status = /\babsent\b/.test(text) ? 'ABSENT' : 'PRESENT';
    const date = this.today();

    const isAll = /\b(all|everyone|everybody|each|whole|every)\b/.test(text);
    const students = await this.fetchStudents(context);
    if (!students.length) {
      return {
        steps: [],
        isComplete: true,
        finalReply: 'There are no students to mark attendance for right now.',
      };
    }

    if (isAll) {
      return {
        steps: students.map((s) => ({
          id: 0,
          tool: 'mark_attendance',
          params: { studentId: this.studentId(s), date, status },
          reasoning: `Mark ${status} attendance for student #${this.studentId(s)} on ${date}`,
        })),
        isComplete: false,
      };
    }

    const name = this.extractAttendanceName(message);
    if (name) {
      const matched = students.filter((s) => this.studentName(s).toLowerCase().includes(name.toLowerCase()));
      if (!matched.length) {
        return {
          steps: [],
          isComplete: true,
          finalReply: `I couldn\u2019t find a student named ${name}. Please check the name or say "mark all present".`,
        };
      }
      return {
        steps: matched.map((s) => ({
          id: 0,
          tool: 'mark_attendance',
          params: { studentId: this.studentId(s), date, status },
          reasoning: `Mark ${status} attendance for student #${this.studentId(s)} on ${date}`,
        })),
        isComplete: false,
      };
    }

    // No explicit name/all: resolve from a student already shown in the
    // conversation ("add attendance to this person" right after looking
    // someone up).
    const contextStudent = this.studentFromContext(context);
    if (contextStudent) {
      return {
        steps: [
          {
            id: 0,
            tool: 'mark_attendance',
            params: { studentId: this.studentId(contextStudent), date, status },
            reasoning: `Mark ${status} attendance for student #${this.studentId(contextStudent)} on ${date}`,
          },
        ],
        isComplete: false,
      };
    }

    return {
      steps: [],
      isComplete: true,
      finalReply: 'For whom should I mark attendance? Give me the student name, or say "mark all present".',
    };
  }

  /**
   * Room creation resolution (WARDEN). "add room A101 in block B floor 2
   * capacity 4". Only treated as a create when the message has a create verb
   * AND a room mention AND (importantly) no arrow-word collision with room
   * lookups. View requests ("show rooms") return null.
   */
  private planRoomAction(_context: AgentContext, message: string): Plan | null {
    const text = message.toLowerCase().trim();
    if (!/\broom\b/.test(text)) return null;
    const isView = /\b(show|list|view|display|see|check|what|get|count|available|vacant|empty|free|all)\b/.test(text);
    const isCreate = /\b(add|create|new|register)\b/.test(text);
    if (isView || !isCreate) return null;

    const explicit =
      message.match(/\broom\s+(?:number\s+)?([a-z]?[0-9][a-z0-9-]*)\b/i) ||
      message.match(/\broom\s+number\s+([a-z]?[0-9][a-z0-9-]*)\b/i);
    if (!explicit) {
      return {
        steps: [],
        isComplete: true,
        finalReply: 'Which room should I add? Please include the room number, e.g. "add room A101 in block B".',
      };
    }

    const roomNumber = explicit[1].toUpperCase();
    const blockMatch = message.match(/\bblock\s+([a-z])/i);
    const block = blockMatch
      ? blockMatch[1].toUpperCase()
      : (roomNumber.match(/[a-z]/i)?.[0]?.toUpperCase() ?? 'A');
    const floor = Number((message.match(/\bfloor\s+(\d+)/i) || [])[1]) || 1;
    const capacity = Number((message.match(/\b(?:capacity|beds|seats)\s+(\d+)/i) || [])[1]) || 4;

    return {
      steps: [
        {
          id: 0,
          tool: 'create_room',
          params: { roomNumber, block, floor, capacity },
          reasoning: `Add room ${roomNumber}`,
        },
      ],
      isComplete: false,
    };
  }

  /**
   * Food menu creation resolution (WARDEN). "add menu for Monday ...". Only
   * create verbs ("add/create/set menu") are treated as create actions; view
   * requests return null.
   */
  private planMenuAction(_context: AgentContext, message: string): Plan | null {
    const text = message.toLowerCase().trim();
    if (!/\b(menu|food)\b/.test(text)) return null;
    const isView = /\b(show|list|view|display|see|check|what|get)\b/.test(text);
    const isCreate = /\b(add|create|set|new)\b/.test(text);
    if (isView || !isCreate) return null;

    const day = this.parseDayOfWeek(text);
    if (!day) {
      return {
        steps: [],
        isComplete: true,
        finalReply: 'For which day should I add the menu? Please say e.g. "add menu for monday".',
      };
    }
    const { breakfast, lunch, snacks, dinner } = this.parseMenuItems(message);
    return {
      steps: [
        {
          id: 0,
          tool: 'create_food_menu',
          params: { day, breakfast, lunch, snacks, dinner },
          reasoning: `Add food menu for ${day}`,
        },
      ],
      isComplete: false,
    };
  }

  /**
   * Classifies whether a warden message is an approve/reject outing action and with
   * which polarity. Detects explicit verbs ("approve", "approve all pending outings"),
   * references to previously displayed outings ("approve them"), and bare student
   * names in an outing-approval context ("Moksha" after pending outings were listed).
   */
  private outingIntent(context: AgentContext, message: string): 'approve' | 'reject' | null {
    const role = String(context.role || '').trim().toUpperCase();
    if (role !== 'WARDEN') return null;

    const text = message.toLowerCase();

    // A request to VIEW/list outings is never an approval action.
    if (/\b(show|list|view|display|see|check|what'?s|get)\b/.test(text)) return null;

    // A message clearly about a DIFFERENT domain (complaints, attendance, food
    // menu, rooms) is never an outing approval — even if it uses approve/reject
    // verbs ("approve complaints", "reject the room"). Those are handled by their
    // own resolvers so the outing resolver never hijacks them.
    if (
      /\b(complaint|complaints|grievance|attendance|present|absent|menu|food|breakfast|lunch|dinner|snacks|rooms?)\b/.test(
        text,
      ) &&
      !/\b(outing|outings|leave|out[ -]?pass)\b/.test(text)
    ) {
      return null;
    }

    const hasRejectVerb = /\b(reject\w*|deny\w*|declin\w*|disapprov\w*|refus\w*)\b/.test(text);
    const hasApproveVerb = /\b(approv\w*|accept\w*|grant\w*|allow\w*)\b/.test(text);

    // Explicit verb takes priority.
    if (hasRejectVerb) return 'reject';
    if (hasApproveVerb) return 'approve';

    // References to previously shown outings ("them"/"these"/"those"/"both"/"all")
    // combined with an approval-ish directive ("approve them", "okay all").
    const references =
      /\b(them|they|those|these|both|all|each|every|it|that)\b/.test(text) &&
      /\b(approv\w*|accept\w*|grant\w*|allow\w*|ok|okay|yes|confirm|please|do|go)\b/.test(text) &&
      this.hasPendingOutingContext(context);
    if (references) return 'approve';

    return null;
  }

  /**
   * True when the conversation context from the previous turn contains at least one
   * pending outing request. Used to interpret bare names / references as approvals.
   */
  private hasPendingOutingContext(context: AgentContext): boolean {
    return this.outingIdsFromContext(context.recentToolResults).length > 0;
  }

  private isBareStudentName(message: string, context: AgentContext): boolean {
    if (!this.hasPendingOutingContext(context)) return false;
    const name = this.extractPersonName(message, true);
    return !!name && this.isPlausibleName(name);
  }

  /**
   * Authoritative end-to-end resolver for warden outing approve/reject actions.
   * Works for explicit IDs, ordinal references ("the first one", "second"),
   * bulk references ("all", "them", "these"), the special "both" case, and
   * student names — all resolved against the stored pending outing IDs from the
   * conversation (when present, otherwise live DB). Never asks a clarifying
   * question when the target is determinable; for ambiguous "both" (>2 pending)
   * it asks which two rather than the student name.
   */
  private async planOutingAction(
    context: AgentContext,
    message: string,
    reject: boolean,
  ): Promise<Plan | null> {
    const role = String(context.role || '').trim().toUpperCase();
    if (role !== 'WARDEN') return null;

    const text = message.toLowerCase().trim();

    // Explicit numeric outing IDs written in the message, e.g. "approve 5 and 6".
    const explicitIds = this.parseExplicitIds(message);

    // A real student name mentioned in the message (ordinal/bulk words excluded).
    const personName = this.extractPersonName(message, true);
    const name = this.isPlausibleName(personName) ? personName : null;

    // Ordinal reference into the current pending list, e.g. "the first one" (0),
    // "second" (1), "3rd" (2). Takes priority over name/bulk interpretation.
    const ordinal = this.parseOrdinalRef(text);

    const makeSteps = (ids: number[]): Plan => ({
      steps: ids.map((id) => ({
        id: 0,
        tool: 'update_outing_status',
        params: { outingId: id, status: reject ? 'Rejected' : 'Approved' },
        reasoning: `${reject ? 'Reject' : 'Approve'} pending outing #${id}`,
      })),
      isComplete: false,
    });

    // 1) Explicit numeric IDs are authoritative when present.
    if (explicitIds.length) return makeSteps(explicitIds);

    // Ground truth: the current pending outings (from stored conversation context
    // when we have it, otherwise re-query the DB so we always act on live data).
    const pending = await this.fetchPendingOutings(context);

    // 2) Ordinal reference maps to a position in the pending list.
    if (ordinal !== null) {
      if (ordinal < pending.length) return makeSteps([pending[ordinal].id]);
      const noun = pending.length === 1 ? 'outing request' : 'outing requests';
      return {
        steps: [],
        isComplete: true,
        finalReply:
          pending.length === 0
            ? 'There are no pending outing requests to act on right now.'
            : `There ${pending.length === 1 ? 'is only 1' : `are only ${pending.length}`} pending ${noun}. Which would you like me to ${reject ? 'reject' : 'approve'}?`,
      };
    }

    // 3) "both" — the two previously shown pending outings.
    if (/\bboth\b/.test(text)) {
      if (pending.length === 2) return makeSteps(pending.map((p) => p.id));
      if (pending.length > 2) {
        return {
          steps: [],
          isComplete: true,
          finalReply:
            `There are ${pending.length} pending outing requests, so "both" is a bit ambiguous. ` +
            `Which two would you like me to ${reject ? 'reject' : 'approve'}? (e.g. "the first and second one")`,
        };
      }
    }

    // 4) Bulk / reference to everything currently pending. A generic plural
    //    reference like "approve outings", "approve the outings" or "approve
    //    pending outings" also means "all pending" — but never when the message
    //    names a specific student ("approve Moksha's outing") or targets a single
    //    outing by ordinal/ID.
    const hasOutingWord = /\b(pending\s+)?(outings?|ones|requests?)\b/.test(text);
    const hasActionVerb = /\b(approv\w*|accept\w*|grant\w*|allow\w*|reject\w*|deny\w*|declin\w*)\b/.test(text);
    const isBulk =
      !name &&
      (
        /\b(them|they|those|these|each|every|everyone|all)\b/.test(text) ||
        (hasOutingWord && hasActionVerb)
      );
    if (isBulk && pending.length) return makeSteps(pending.map((p) => p.id));

    // 5) A named student's pending outing(s).
    if (name) {
      const ids = pending
        .filter((p) => {
          const pName = p?.student?.name as string | undefined;
          return typeof pName === 'string' && pName.toLowerCase().includes(name.toLowerCase());
        })
        .map((p) => p.id);
      if (ids.length) return makeSteps(ids);
    }

    // We could not resolve a live target from a clearly-actionable request. Help
    // the warden rather than silently failing.
    return {
      steps: [],
      isComplete: true,
      finalReply: name
        ? `I couldn\u2019t find a pending outing request from ${name}. Please double-check the name, or share the outing request ID if you have it.`
        : 'There are no pending outing requests to approve right now.',
    };
  }

  /**
   * Parses an ordinal reference ("the first one", "2nd", "second") into a 0-based
   * index into the pending outing list. Returns null when the message does not
   * clearly reference a position. Guarded so bare numbers like "5" are NOT read
   * as ordinals (those are handled by explicit IDs).
   */
  private parseOrdinalRef(text: string): number | null {
    const ordinalWords: Record<string, number> = {
      first: 0,
      second: 1,
      third: 2,
      fourth: 3,
      fifth: 4,
      sixth: 5,
      seventh: 6,
      eighth: 7,
      ninth: 8,
      tenth: 9,
    };

    // Positional suffixes: "1st", "2nd", "3rd", "4th", ...
    const suffixed = text.match(/(?:^|\b)(\d{1,2})(st|nd|rd|th)\b/);
    if (suffixed) {
      const n = Number(suffixed[1]);
      if (n >= 1 && n <= 10) return n - 1;
    }

    // Ordinal word forms: "first one", "the second", "third one", ...
    for (const word of Object.keys(ordinalWords)) {
      if (new RegExp(`\\b${word}\\b`).test(text)) return ordinalWords[word];
    }

    return null;
  }

  /**
   * Returns all current pending outings from the conversation context when it
   * contains them; otherwise re-queries the live DB so actions are authoritative.
   */
  private async fetchPendingOutings(context: AgentContext): Promise<any[]> {
    if (this.hasPendingOutingContext(context)) {
      const fromContext = this.parseOutingRows(context.recentToolResults);
      if (fromContext.length) return fromContext;
    }
    const tool = this.toolRegistry.get('get_all_outing_requests');
    const result = await tool.execute({ status: 'Pending' }, context);
    return this.rows(result, 'get_all_outing_requests');
  }

  /** Parses an array of outing rows (with student info) out of recent tool results. */
  private parseOutingRows(recent: string | undefined): any[] {
    return this.parseContextRows(recent);
  }

  /**
   * Generic parser for the serialized tool results stored in the conversation
   * context. Each persisted line is "tool: <json>"; this extracts every object
   * in that JSON (handling arrays and nested objects). Used for outings,
   * complaints, students, rooms, etc.
   */
  private parseContextRows(recent: string | undefined): any[] {
    if (!recent) return [];
    const rows: any[] = [];
    for (const line of recent.split('\n')) {
      const idx = line.indexOf(': ');
      if (idx < 0) continue;
      try {
        const parsed = JSON.parse(line.slice(idx + 2));
        const push = (v: unknown): void => {
          if (Array.isArray(v)) v.forEach(push);
          else if (v && typeof v === 'object') rows.push(v as any);
        };
        push(parsed);
      } catch {
        /* ignore non-JSON lines */
      }
    }
    return rows;
  }

  /** Returns the current pending complaints from context, else re-queries the DB. */
  private async fetchPendingComplaints(context: AgentContext): Promise<any[]> {
    const complaintRows = this.parseContextRows(context.recentToolResults).filter(
      (r) => r && (typeof r.title === 'string' || typeof r.description === 'string'),
    );
    if (complaintRows.length) {
      return complaintRows.filter((c) => String(c.status || '').toUpperCase() === 'PENDING');
    }
    const tool = this.toolRegistry.get('get_all_complaints');
    const result = await tool.execute({ status: 'PENDING' }, context);
    return this.rows(result, 'get_all_complaints');
  }

  /** Returns students the warden can act on, from context or live DB. */
  private async fetchStudents(context: AgentContext): Promise<any[]> {
    const fromContext = this.parseContextRows(context.recentToolResults).filter(
      (r) => r && typeof r.id === 'number' && (typeof r.rollNumber === 'string' || Boolean(r.user)),
    );
    if (fromContext.length) return fromContext;
    const tool = this.toolRegistry.get('get_all_students');
    const result = await tool.execute({}, context);
    return this.rows(result, 'get_all_students');
  }

  /** A student already shown in the conversation ("this person"). */
  private studentFromContext(context: AgentContext): any | null {
    const rows = this.parseContextRows(context.recentToolResults);
    return (
      rows.find((r) => r && typeof r.id === 'number' && (typeof r.rollNumber === 'string' || Boolean(r.user))) ||
      null
    );
  }

  /**
   * Extracts a student name from an attendance command, e.g. "add attendance
   * to Moksha" -> "Moksha". Rejects bulk words via isPlausibleName.
   */
  private extractAttendanceName(message: string): string | null {
    const m = message.match(/\b(?:to|for|of|from)\s+([A-Za-z][a-z]+)\b/);
    if (!m) return null;
    const candidate = m[1];
    return this.isPlausibleName(candidate) ? candidate : null;
  }

  private studentId(row: any): number {
    const raw = row?.id ?? row?.studentId;
    return typeof raw === 'number' ? raw : Number(raw) || 0;
  }

  private studentName(row: any): string {
    if (!row) return '';
    return String(
      row?.user?.name ||
        row?.student?.user?.name ||
        row?.student?.name ||
        row?.name ||
        row?.studentName ||
        '',
    );
  }

  private parseDayOfWeek(text: string): string | null {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const found = days.find((d) => text.includes(d));
    return found ? found.toUpperCase() : null;
  }

  /**
   * Pulls meal items from a menu message like "add menu for monday: breakfast
   * idli vada, lunch rice curry, snacks tea, dinner chapati" into the separate
   * fields (each fragment cut at the next meal keyword). Missing meals default
   * to an empty string so the warden can fill them in later.
   */
  private parseMenuItems(message: string): { breakfast: string; lunch: string; snacks: string; dinner: string } {
    const order: Array<'breakfast' | 'lunch' | 'snacks' | 'dinner'> = ['breakfast', 'lunch', 'snacks', 'dinner'];
    const out: Record<string, string> = { breakfast: '', lunch: '', snacks: '', dinner: '' };
    const lower = message.toLowerCase();

    for (let i = 0; i < order.length; i++) {
      const key = order[i];
      const start = lower.indexOf(key);
      if (start < 0) continue;
      const after = start + key.length;
      let end = message.length;
      for (let j = 0; j < order.length; j++) {
        if (j === i) continue;
        const other = lower.indexOf(order[j], after);
        if (other >= 0 && other < end) end = other;
      }
      const raw = message
        .slice(after, end)
        .replace(/^[\s:,\-\u2014;]+/, '')
        .replace(/[\s,.;:]+$/, '');
      if (raw) out[key] = raw;
    }
    return { breakfast: out.breakfast, lunch: out.lunch, snacks: out.snacks, dinner: out.dinner };
  }

  private today(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  private parseExplicitIds(message: string): number[] {
    const ids: number[] = [];
    const text = message.replace(/\b(approv\w*|reject\w*|accept\w*|deny\w*|outings?)\b/gi, ' ');
    const matches = text.match(/(?:#|request\s*#?|id\s*#?)?\b(\d{1,8})\b/g) || [];
    for (const m of matches) {
      const num = Number(m.replace(/[^0-9]/g, ''));
      if (num > 0) ids.push(num);
    }
    return [...new Set(ids)];
  }

  /**
   * Extracts numeric outing IDs from the serialized recent tool results. Handles
   * both a JSON array of outing objects with an `id` field and bare comma/space
   * separated numeric IDs like "5, 6, 7".
   */
  private outingIdsFromContext(recent: string | undefined): number[] {
    if (!recent) return [];
    const ids: number[] = [];

    for (const line of recent.split('\n')) {
      const idx = line.indexOf(': ');
      if (idx < 0) continue;
      const json = line.slice(idx + 2);
      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch {
        // Not JSON — try scanning for numeric IDs in the text.
        const matches = json.match(/\b\d{1,10}\b/g);
        if (matches) ids.push(...matches.map(Number));
        continue;
      }
      const collect = (v: unknown): void => {
        if (Array.isArray(v)) {
          for (const item of v) collect(item);
        } else if (v && typeof v === 'object') {
          const o = v as Record<string, unknown> & { id?: unknown };
          const id = typeof o.id === 'number' ? o.id : Number(o.id);
          if (Number.isFinite(id) && id > 0) ids.push(id);
        }
      };
      collect(parsed);
    }

    // De-dupe while preserving order.
    return [...new Set(ids)];
  }

  /**
   * Extracts a likely student name from an action command, e.g.:
   *   "approve Moksha's outing"       -> "Moksha"
   *   "approve the outing of Moksha"  -> "Moksha"
   *   "Moksha"                        -> "Moksha"
   * Rejects pronouns/bulk/utility words that are not names.
   */
  private extractPersonName(message: string, allowBare = false): string | null {
    // Patterns are case-insensitive for the action verb but still capture the
    // student's capitalized name (matched case-insensitively), e.g. "Moksha".
    const patterns = [
      /(?:approv\w*|reject\w*|accept\w*|deny\w*|grant\w*)\s+(?:the\s+)?(?:outing\s+(?:request\s+)?(?:of|from)\s+)?([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
      /([a-zA-Z]+(?:\s+[a-zA-Z]+)?)(?:'s|\u2019s)\s+(?:pending\s+)?(?:outings?|leave)/i,
      /(?:for|of|student)\s+([a-zA-Z]+)(?:\s+[a-zA-Z]+)?/i,
    ];

    if (!message) return null;
    for (const pat of patterns) {
      const m = message.match(pat);
      if (m && this.isPlausibleName(m[1])) return m[1].trim();
    }

    // Bare-name mode: the whole message is a single name ("Moksha" or "moksha").
    if (allowBare) {
      const trimmed = message.trim();
      if (/^[A-Za-z][a-zA-Z]+(?:\s+[A-Za-z][a-zA-Z]+)?$/.test(trimmed) && this.isPlausibleName(trimmed)) {
        return trimmed;
      }
    }

    return null;
  }

  /**
   * Filters out words that look like names but are instead bulk references or
   * utility words in an approval command ("them", "all", "these", "pending", ...).
   * A multi-word candidate is rejected if ANY of its tokens is a stop word, so a
   * fragment like "pending outings" is never treated as a student name.
   */
  private isPlausibleName(value: string | null | undefined): boolean {
    if (!value) return false;
    const trimmed = value.trim();
    const lower = trimmed.toLowerCase();
    if (!lower) return false;
    const stop = new Set([
      'them', 'they', 'those', 'these', 'both', 'all', 'each', 'every', 'everyone',
      'it', 'that', 'this', 'pending', 'ones', 'the', 'of', 'from', 'for', 'outing',
      'outings', 'request', 'requests', 'approve', 'approving', 'approved', 'approves',
      'accept', 'accepting', 'accepted', 'accepts',
      'reject', 'rejecting', 'rejected', 'rejects',
      'deny', 'denying', 'denied', 'denies',
      'decline', 'declining', 'declined', 'declines',
      'leave', 'his', 'her', 'their', 'some', 'any', 'none', 'one', 'two', 'three',
      'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'me', 'you', 'please',
      'right', 'now', 'yes', 'ok', 'okay', 'hi', 'hello', 'hey', 'thanks', 'thank',
      'yup', 'yeah', 'sure', 'done', 'go', 'do', 'can', 'want', 'theirs', 'hers',
      'good', 'morning', 'afternoon', 'evening', 'night',
      // Other dashboard domains must never be interpreted as a student name.
      'complaint', 'complaints', 'grievance', 'grievances', 'attendance',
      'present', 'absent', 'menu', 'food', 'room', 'rooms', 'student', 'students',
      'person', 'people', 'today', 'now',
      // Ordinal position words must never be interpreted as a student name.
      'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth',
      'ninth', 'tenth',
    ]);
    if (stop.has(lower)) return false;
    if (!/^[A-Za-z][a-z]+(\s+[A-Za-z][a-z]+)*$/.test(trimmed)) return false;
    const tokens = lower.split(/\s+/);
    return tokens.every((t) => !stop.has(t));
  }

  private rows(result: ToolResult, tool: string): any[] {
    if (!result || !result.success) return [];
    if (Array.isArray(result.data)) return result.data;
    console.log(`[AGENT DETERMINISTIC] ${tool} returned non-array data`);
    return [];
  }

  private allowed(context: AgentContext, tool: string): boolean {
    try {
      this.permissionPolicy.check(tool, context);
      return true;
    } catch {
      return false;
    }
  }
}
