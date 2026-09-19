import { Injectable } from '@nestjs/common';
import type { ToolHandler, ToolResult } from '../../types/tool.types.js';
import type { AgentContext } from '../../types/agent.types.js';
import { AttendanceService } from '../../../attendance/attendance.service.js';
import { AttendanceStatus } from '../../../attendance/dto/attendance.dto.js';
import { AuthService } from '../../../auth/auth.service.js';

@Injectable()
export class AttendanceTools implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_my_attendance',
    description: 'Get the attendance records for the current student.',
    parameters: [],
  };

  constructor(
    private readonly attendance: AttendanceService,
    private readonly auth: AuthService,
  ) {}

  async execute(_params: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    try {
      const requestingUser = { sub: context.userId, email: '', role: context.role };
      const me = await this.auth.getMe(requestingUser);
      const student = me.student;
      if (!student) return { success: false, error: 'Student profile not found.' };

      const records = await this.attendance.findByStudent(student.id, requestingUser);
      const sorted = records.sort((a, b) => b.date.localeCompare(a.date));
      return { success: true, data: sorted };
    } catch {
      return { success: false, error: 'Failed to fetch attendance records.' };
    }
  }
}

@Injectable()
export class GetAllAttendanceTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_all_attendance',
    description:
      'Get attendance records for all students, optionally filtered by date (YYYY-MM-DD) and/or status (PRESENT | ABSENT). (Warden only)',
    parameters: [
      { name: 'date', type: 'string', description: 'Filter by date (YYYY-MM-DD). Optional.', required: false },
      { name: 'status', type: 'string', description: 'Filter by status: PRESENT or ABSENT. Optional.', required: false, enum: ['PRESENT', 'ABSENT'] },
    ],
  };

  constructor(private readonly attendance: AttendanceService) {}

  async execute(params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const date = params.date as string | undefined;
      const status = params.status as string | undefined;

      let records = await this.attendance.findAll();
      if (date) records = records.filter((r) => r.date === date);
      if (status) records = records.filter((r) => String(r.status).toUpperCase() === String(status).toUpperCase());
      const sorted = records.sort((a, b) => b.date.localeCompare(a.date));
      return { success: true, data: sorted };
    } catch {
      return { success: false, error: 'Failed to fetch overall attendance.' };
    }
  }
}

@Injectable()
export class GetStudentAttendanceTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_student_attendance',
    description: 'Get attendance records for a specific student by student ID. (Warden only)',
    parameters: [
      { name: 'studentId', type: 'number', description: 'The student ID', required: true },
    ],
  };
  constructor(private readonly attendance: AttendanceService) {}

  async execute(params: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    try {
      const studentId = params.studentId as number;
      const records = await this.attendance.findByStudent(studentId, {
        sub: context.userId,
        role: context.role,
      });
      const sorted = records.sort((a, b) => b.date.localeCompare(a.date));
      return { success: true, data: sorted };
    } catch {
      return { success: false, error: 'Failed to fetch student attendance.' };
    }
  }
}

@Injectable()
export class UpdateAttendanceTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'update_attendance',
    description: 'Update an attendance record status. (Warden only)',
    parameters: [
      { name: 'attendanceId', type: 'number', description: 'The attendance record ID', required: true },
      { name: 'status', type: 'string', description: 'New status', required: true, enum: ['PRESENT', 'ABSENT'] },
    ],
  };

  constructor(private readonly attendance: AttendanceService) {}

  async execute(params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const id = params.attendanceId as number;
      const status = params.status as AttendanceStatus;
      const updated = await this.attendance.update(id, { status });
      if (!updated) return { success: false, error: 'Attendance record not found.' };
      return { success: true, data: { id, status: updated.status } };
    } catch {
      return { success: false, error: 'Failed to update attendance record.' };
    }
  }
}

@Injectable()
export class MarkAttendanceTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'mark_attendance',
    description:
      'Mark/create attendance for a student on a date (PRESENT or ABSENT). (Warden only). Requires confirmation.',
    requiresConfirmation: true,
    parameters: [
      { name: 'studentId', type: 'number', description: 'The student ID', required: true },
      { name: 'date', type: 'string', description: 'Attendance date (YYYY-MM-DD)', required: true },
      { name: 'status', type: 'string', description: 'PRESENT or ABSENT', required: true, enum: ['PRESENT', 'ABSENT'] },
    ],
  };

  constructor(private readonly attendance: AttendanceService) {}

  async execute(params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const studentId = params.studentId as number;
      const date = params.date as string;
      const status = params.status as AttendanceStatus;
      const created = await this.attendance.create({ studentId, date, status });
      return { success: true, data: { id: created.id, studentId, date, status: created.status } };
    } catch {
      return { success: false, error: 'Failed to mark attendance (it may already be marked for that date).' };
    }
  }
}
