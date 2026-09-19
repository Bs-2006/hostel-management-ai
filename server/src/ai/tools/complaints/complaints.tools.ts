import { Injectable } from '@nestjs/common';
import type { ToolHandler, ToolResult } from '../../types/tool.types.js';
import type { AgentContext } from '../../types/agent.types.js';
import { ComplaintsService } from '../../../complaints/complaints.service.js';
import { ComplaintStatus } from '../../../complaints/dto/complaint.dto.js';

@Injectable()
export class CreateComplaintTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'create_complaint',
    description: 'File a new complaint about the hostel.',
    parameters: [
      { name: 'title', type: 'string', description: 'Complaint title', required: true },
      { name: 'description', type: 'string', description: 'Detailed description', required: true },
    ],
  };

  constructor(private readonly complaints: ComplaintsService) {}

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    try {
      const complaint = await this.complaints.create(
        { title: params.title as string, description: params.description as string },
        { sub: context.userId, role: context.role },
      );
      return { success: true, data: { title: complaint.title, status: complaint.status } };
    } catch {
      return { success: false, error: 'Failed to create complaint.' };
    }
  }
}

@Injectable()
export class GetMyComplaintsTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_my_complaints',
    description: 'Get all complaints filed by the current student.',
    parameters: [],
  };

  constructor(private readonly complaints: ComplaintsService) {}

  async execute(_params: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    try {
      const complaints = await this.complaints.findMine({ sub: context.userId, role: context.role });
      const sorted = complaints.sort((a, b) => b.id - a.id);
      return { success: true, data: sorted };
    } catch {
      return { success: false, error: 'Failed to fetch complaints.' };
    }
  }
}

@Injectable()
export class GetAllComplaintsTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_all_complaints',
    description:
      'Get all complaints in the system, optionally filtered by status (PENDING | IN_PROGRESS | RESOLVED | REJECTED). (Warden only)',
    parameters: [
      { name: 'status', type: 'string', description: 'Filter by status. Optional.', required: false, enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] },
    ],
  };

  constructor(private readonly complaints: ComplaintsService) {}

  async execute(params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const status = params.status as string | undefined;
      let complaints = await this.complaints.findAll();
      if (status) complaints = complaints.filter((c) => String(c.status).toUpperCase() === String(status).toUpperCase());
      const sorted = complaints.sort((a, b) => b.id - a.id);
      return { success: true, data: sorted };
    } catch {
      return { success: false, error: 'Failed to fetch complaints.' };
    }
  }
}

@Injectable()
export class GetComplaintTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_complaint',
    description: 'Get a specific complaint by ID. (Warden only)',
    parameters: [
      { name: 'complaintId', type: 'number', description: 'Complaint ID', required: true },
    ],
  };

  constructor(private readonly complaints: ComplaintsService) {}

  async execute(params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const id = params.complaintId as number;
      const complaint = await this.complaints.findOne(id);
      return { success: true, data: complaint };
    } catch {
      return { success: false, error: 'Complaint not found.' };
    }
  }
}

@Injectable()
export class UpdateComplaintStatusTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'update_complaint_status',
    description: 'Update complaint status. (Warden only)',
    parameters: [
      { name: 'complaintId', type: 'number', description: 'Complaint ID', required: true },
      { name: 'status', type: 'string', description: 'New status', required: true, enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] },
    ],
  };

  constructor(private readonly complaints: ComplaintsService) {}

  async execute(params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const id = params.complaintId as number;
      const status = params.status as ComplaintStatus;
      const updated = await this.complaints.updateStatus(id, { status });
      if (!updated) return { success: false, error: 'Complaint not found.' };
      return { success: true, data: { id, status: updated.status } };
    } catch {
      return { success: false, error: 'Failed to update complaint status.' };
    }
  }
}
