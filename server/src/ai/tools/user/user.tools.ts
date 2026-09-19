import { Injectable } from '@nestjs/common';
import type { ToolHandler, ToolResult } from '../../types/tool.types.js';
import type { AgentContext } from '../../types/agent.types.js';
import { AuthService } from '../../../auth/auth.service.js';
import { StudentsService } from '../../../students/students.service.js';
import { RoomsService } from '../../../rooms/rooms.service.js';

@Injectable()
export class GetMyProfileTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_my_profile',
    description: 'Get the current user profile information, including assigned room details.',
    parameters: [],
  };

  constructor(
    private readonly auth: AuthService,
    private readonly students: StudentsService,
  ) {}

  async execute(_params: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    try {
      const user = await this.auth.getMe({ sub: context.userId, email: '', role: context.role });
      const student = user.student;

      if (student?.id) {
        const enriched = await this.students.findOne(student.id);
        return { success: true, data: enriched };
      }

      return { success: true, data: user };
    } catch {
      return { success: false, error: 'Failed to fetch profile.' };
    }
  }
}

@Injectable()
export class GetMyRoomTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_my_room',
    description:
      'Get the current student\'s assigned hostel room (room number and details).',
    parameters: [],
  };

  constructor(
    private readonly auth: AuthService,
    private readonly students: StudentsService,
  ) {}

  async execute(_params: Record<string, unknown>, context: AgentContext): Promise<ToolResult> {
    try {
      const user = await this.auth.getMe({ sub: context.userId, email: '', role: context.role });
      const student = user.student;
      if (!student?.id) return { success: false, error: 'Student profile not found.' };

      const enriched = await this.students.findOne(student.id);
      if (!enriched.room) {
        return { success: false, error: 'No room is assigned to this student yet.' };
      }

      return { success: true, data: enriched.room };
    } catch {
      return { success: false, error: 'Failed to fetch room details.' };
    }
  }
}

@Injectable()
export class GetStudentProfileTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_student_profile',
    description: 'Get a student profile by student ID. (Warden only)',
    parameters: [
      { name: 'studentId', type: 'number', description: 'Student ID', required: true },
    ],
  };

  constructor(private readonly students: StudentsService) {}

  async execute(params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const studentId = params.studentId as number;
      const student = await this.students.findOne(studentId);
      return { success: true, data: student };
    } catch {
      return { success: false, error: 'Failed to fetch student profile.' };
    }
  }
}

@Injectable()
export class GetAllStudentsTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_all_students',
    description:
      'List all registered students with their name, student ID, roll number, branch, year and assigned room. (Warden only)',
    parameters: [],
  };

  constructor(private readonly students: StudentsService) {}

  async execute(_params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const students = await this.students.findAll();
      if (students.length === 0) return { success: true, data: [] };
      return { success: true, data: students };
    } catch {
      return { success: false, error: 'Failed to fetch students.' };
    }
  }
}

@Injectable()
export class GetStudentsInRoomTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'get_students_in_room',
    description:
      'List the students currently assigned to a specific room number. (Warden only)',
    parameters: [
      { name: 'roomNumber', type: 'string', description: 'Room number, e.g. "101" or "A-101"', required: true },
    ],
  };

  constructor(private readonly rooms: RoomsService) {}

  async execute(params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const roomNumber = params.roomNumber as string;
      const rooms = await this.rooms.findWithOccupants(roomNumber);
      if (rooms.length === 0) return { success: false, error: `Room ${roomNumber} not found.` };
      return { success: true, data: rooms[0].occupants };
    } catch {
      return { success: false, error: 'Failed to fetch room occupants.' };
    }
  }
}

@Injectable()
export class AssignRoomTool implements ToolHandler {
  readonly definition: ToolHandler['definition'] = {
    name: 'assign_room',
    description:
      'Assign a student to a hostel room by student ID and room ID. Requires confirmation. (Warden only)',
    requiresConfirmation: true,
    parameters: [
      { name: 'studentId', type: 'number', description: 'Student ID', required: true },
      { name: 'roomId', type: 'number', description: 'Room ID', required: true },
    ],
  };

  constructor(private readonly students: StudentsService) {}

  async execute(params: Record<string, unknown>, _context: AgentContext): Promise<ToolResult> {
    try {
      const studentId = params.studentId as number;
      const roomId = params.roomId as number;
      const result = await this.students.assignRoom(studentId, { roomId });
      return { success: true, data: result };
    } catch {
      return { success: false, error: 'Failed to assign room.' };
    }
  }
}
