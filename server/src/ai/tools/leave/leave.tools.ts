import { Injectable } from '@nestjs/common';
import type { ToolHandler, ToolResult } from '../../types/tool.types.js';
import type { AgentContext } from '../../types/agent.types.js';
import { OutingsService } from '../../../outings/outings.service.js';

@Injectable()
export class CreateOutingTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'create_outing',
    description: 'Request an outing from the hostel.',
    requiresConfirmation: true,
    parameters: [
      { name: 'destination', type: 'string', description: 'Destination of the outing', required: true },
      { name: 'reason', type: 'string', description: 'Reason for the outing', required: true },
      { name: 'outingDate', type: 'string', description: 'Date in YYYY-MM-DD format', required: true },
      { name: 'outTime', type: 'string', description: 'Out time in HH:MM format', required: true },
      { name: 'inTime', type: 'string', description: 'Expected return time in HH:MM format', required: true },
    ],
  };

  constructor(private readonly outings: OutingsService) {}

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    try {
      const outing = await this.outings.create(
        {
          destination: params.destination as string,
          reason: params.reason as string,
          outingDate: params.outingDate as string,
          outTime: params.outTime as string,
          inTime: params.inTime as string,
        },
        { sub: context.userId, role: context.role },
      );
      return { success: true, data: { id: outing.id, status: outing.status } };
    } catch {
      return { success: false, error: 'Failed to create outing request.' };
    }
  }
}

@Injectable()
export class GetMyOutingsTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_my_outings',
    description: 'Get all outings requested by the current student.',
    parameters: [],
  };

  constructor(private readonly outings: OutingsService) {}

  async execute(_params: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    try {
      const outings = await this.outings.findAll({ sub: context.userId, role: context.role });
      const sorted = outings.sort((a, b) => b.id - a.id);
      return { success: true, data: sorted };
    } catch {
      return { success: false, error: 'Failed to fetch outings.' };
    }
  }
}

@Injectable()
export class GetAllOutingRequestsTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_all_outing_requests',
    description:
      'Retrieve outing requests submitted by students, including the student name and ID, optionally filtered by status (Pending | Approved | Rejected) and/or date (YYYY-MM-DD). Available only to WARDEN users.',
    parameters: [
      { name: 'status', type: 'string', description: 'Filter by status: Pending, Approved or Rejected. Optional.', required: false, enum: ['Pending', 'Approved', 'Rejected'] },
      { name: 'date', type: 'string', description: 'Filter by outing date (YYYY-MM-DD). Optional.', required: false },
    ],
  };

  constructor(private readonly outings: OutingsService) {}

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    try {
      const status = params.status as string | undefined;
      const date = params.date as string | undefined;
      let outings = await this.outings.findAllWithStudents({ sub: context.userId, role: context.role });
      if (status) outings = outings.filter((o) => o.status === status);
      if (date) outings = outings.filter((o) => o.outingDate === date);
      const sorted = outings.sort((a, b) => b.id - a.id);
      return { success: true, data: sorted };
    } catch {
      return { success: false, error: 'Failed to fetch outing requests.' };
    }
  }
}

@Injectable()
export class GetAllOutingsTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_all_outings',
    description:
      'Get all outing requests, optionally filtered by status (Pending | Approved | Rejected) and/or date (YYYY-MM-DD). (Warden only)',
    parameters: [
      { name: 'status', type: 'string', description: 'Filter by status. Optional.', required: false, enum: ['Pending', 'Approved', 'Rejected'] },
      { name: 'date', type: 'string', description: 'Filter by outing date (YYYY-MM-DD). Optional.', required: false },
    ],
  };

  constructor(private readonly outings: OutingsService) {}

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    try {
      const status = params.status as string | undefined;
      const date = params.date as string | undefined;
      let outings = await this.outings.findAll({ sub: context.userId, role: context.role });
      if (status) outings = outings.filter((o) => o.status === status);
      if (date) outings = outings.filter((o) => o.outingDate === date);
      const sorted = outings.sort((a, b) => b.id - a.id);
      return { success: true, data: sorted };
    } catch {
      return { success: false, error: 'Failed to fetch outings.' };
    }
  }
}

@Injectable()
export class GetOutingTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_outing',
    description: 'Get a specific outing by ID.',
    parameters: [
      { name: 'outingId', type: 'number', description: 'Outing ID', required: true },
    ],
  };

  constructor(private readonly outings: OutingsService) {}

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    try {
      const id = params.outingId as number;
      const outing = await this.outings.findOne(id, { sub: context.userId, role: context.role });
      return { success: true, data: outing };
    } catch {
      return { success: false, error: 'Failed to fetch outing.' };
    }
  }
}

@Injectable()
export class UpdateOutingStatusTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'update_outing_status',
    description: 'Approve or reject an outing request. (Warden only)',
    parameters: [
      { name: 'outingId', type: 'number', description: 'Outing ID', required: true },
      { name: 'status', type: 'string', description: 'New status', required: true, enum: ['Approved', 'Rejected'] },
    ],
  };

  constructor(private readonly outings: OutingsService) {}

  async execute(params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      // Accept both outingId and id (LLM may send "id") and coerce string -> number
      const rawId = (params.outingId ?? params['id'] ?? params['outing_id']) as unknown;
      const id = typeof rawId === 'string' ? Number(String(rawId).replace(/[^0-9]/g, '')) : Number(rawId);
      if (!Number.isFinite(id) || id <= 0) return { success: false, error: 'Invalid outing ID.' };
      const status = params.status as 'Approved' | 'Rejected';
      if (status !== 'Approved' && status !== 'Rejected') return { success: false, error: 'Status must be Approved or Rejected.' };
      const updated = await this.outings.updateStatus(id, status);
      if (!updated) return { success: false, error: 'Outing not found.' };
      return { success: true, data: { id, status: updated.status } };
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      // Surface already-approved/rejected as a friendly message instead of generic failure
      if (msg.includes('already')) return { success: false, error: msg };
      if (msg.includes('not found')) return { success: false, error: msg };
      return { success: false, error: 'Failed to update outing status.' };
    }
  }
}
