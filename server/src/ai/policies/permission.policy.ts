import { Injectable } from '@nestjs/common';
import type { AgentContext } from '../types/agent.types.js';
import { PermissionDeniedError } from '../errors/agent.errors.js';

// Roles are normalized to uppercase. The JWT/DB may carry "WARDEN"/"warden"
// or "STUDENT"/"RESIDENT". Both STUDENT and RESIDENT map to the same set.
const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  STUDENT: new Set([
    'get_my_attendance',
    'create_complaint',
    'get_my_complaints',
    'create_outing',
    'get_my_outings',
    'get_my_profile',
    'get_my_room',
    'get_food_menu',
    'get_food_menu_week',
  ]),
  RESIDENT: new Set([
    'get_my_attendance',
    'create_complaint',
    'get_my_complaints',
    'create_outing',
    'get_my_outings',
    'get_my_profile',
    'get_my_room',
    'get_food_menu',
    'get_food_menu_week',
  ]),
  WARDEN: new Set([
    // Food menu
    'get_food_menu',
    'get_food_menu_week',
    'create_food_menu',
    // Attendance
    'get_all_attendance',
    'get_student_attendance',
    'update_attendance',
    'mark_attendance',
    // Complaints
    'get_all_complaints',
    'get_complaint',
    'update_complaint_status',
    // Outings
    'get_all_outings',
    'get_all_outing_requests',
    'get_outing',
    'update_outing_status',
    // Rooms
    'get_all_rooms',
    'get_available_rooms',
    'get_room_details',
    'get_students_in_room',
    'assign_room',
    'create_room',
    // User / students
    'get_my_profile',
    'get_my_room',
    'get_student_profile',
    'get_all_students',
  ]),
};

@Injectable()
export class PermissionPolicy {
  /**
   * Enforces access using ONLY the authenticated context.role (from the JWT).
   * The role is normalized (uppercased) so casing in the DB/JWT cannot break
   * authorization. It never uses the LLM's interpretation or the user message.
   */
  check(toolName: string, context: AgentContext): void {
    const role = String(context.role || '').trim().toUpperCase();
    const allowed = ROLE_PERMISSIONS[role];
    if (!allowed || !allowed.has(toolName)) {
      throw new PermissionDeniedError(`use tool "${toolName}" as ${role || 'unknown role'}`);
    }
  }
}
