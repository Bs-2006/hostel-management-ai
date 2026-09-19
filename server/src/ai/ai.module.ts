import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthService } from '../auth/auth.service.js';
import { AttendanceService } from '../attendance/attendance.service.js';
import { ComplaintsService } from '../complaints/complaints.service.js';
import { OutingsService } from '../outings/outings.service.js';
import { StudentsService } from '../students/students.service.js';
import { FoodMenuService } from '../food-menu/food-menu.service.js';
import { RoomsService } from '../rooms/rooms.service.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AgentStateService } from './state/agent-state.service.js';
import { OrchestrationService } from './orchestration/orchestration.service.js';
import { PlannerService } from './orchestration/planner.service.js';
import { ExecutorService } from './orchestration/executor.service.js';
import { VerifierService } from './orchestration/verifier.service.js';
import { DeterministicPlannerService } from './orchestration/deterministic-planner.service.js';
import { ToolRegistry } from './tools/tool.registry.js';
import { PermissionPolicy } from './policies/permission.policy.js';
import { ValidationPolicy } from './policies/validation.policy.js';
import { ConfirmationPolicy } from './policies/confirmation.policy.js';
import { SafetyPolicy } from './policies/safety.policy.js';

import { AttendanceTools, GetStudentAttendanceTool, UpdateAttendanceTool, GetAllAttendanceTool, MarkAttendanceTool } from './tools/attendance/attendance.tools.js';
import { CreateComplaintTool, GetMyComplaintsTool, GetAllComplaintsTool, GetComplaintTool, UpdateComplaintStatusTool } from './tools/complaints/complaints.tools.js';
import { CreateOutingTool, GetMyOutingsTool, GetAllOutingsTool, GetOutingTool, UpdateOutingStatusTool, GetAllOutingRequestsTool } from './tools/leave/leave.tools.js';
import { GetMyProfileTool, GetMyRoomTool, GetStudentProfileTool, GetAllStudentsTool, GetStudentsInRoomTool, AssignRoomTool } from './tools/user/user.tools.js';
import { GetFoodMenuTool, GetFoodMenuWeekTool, CreateFoodMenuTool } from './tools/food/food.tools.js';
import { GetAllRoomsTool, GetAvailableRoomsTool, GetRoomDetailsTool, CreateRoomTool } from './tools/rooms/rooms.tools.js';

@Module({
  imports: [AuthModule], // provides JwtModule for JwtGuard
  controllers: [AiController],
  providers: [
    AiService,
    AgentStateService,
    OrchestrationService,
    PlannerService,
    ExecutorService,
    VerifierService,
    DeterministicPlannerService,
    ToolRegistry,
    PermissionPolicy,
    ValidationPolicy,
    ConfirmationPolicy,
    SafetyPolicy,

    // Existing backend services consumed by the tools.
    AuthService,
    AttendanceService,
    ComplaintsService,
    OutingsService,
    StudentsService,
    FoodMenuService,
    RoomsService,

    // Agent tools.
    AttendanceTools,
    GetStudentAttendanceTool,
    UpdateAttendanceTool,
    GetAllAttendanceTool,
    CreateComplaintTool,
    GetMyComplaintsTool,
    GetAllComplaintsTool,
    GetComplaintTool,
    UpdateComplaintStatusTool,
    CreateOutingTool,
    GetMyOutingsTool,
    GetAllOutingsTool,
    GetOutingTool,
    UpdateOutingStatusTool,
    GetAllOutingRequestsTool,
    GetMyProfileTool,
    GetMyRoomTool,
    GetStudentProfileTool,
    GetAllStudentsTool,
    GetStudentsInRoomTool,
    AssignRoomTool,
    GetFoodMenuTool,
    GetFoodMenuWeekTool,
    CreateFoodMenuTool,
    GetAllRoomsTool,
    GetAvailableRoomsTool,
    GetRoomDetailsTool,
    CreateRoomTool,
    MarkAttendanceTool,
  ],
  exports: [AgentStateService, ToolRegistry],
})
export class AiModule {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly attendanceTools: AttendanceTools,
    private readonly getStudentAttendanceTool: GetStudentAttendanceTool,
    private readonly updateAttendanceTool: UpdateAttendanceTool,
    private readonly getAllAttendanceTool: GetAllAttendanceTool,
    private readonly createComplaintTool: CreateComplaintTool,
    private readonly getMyComplaintsTool: GetMyComplaintsTool,
    private readonly getAllComplaintsTool: GetAllComplaintsTool,
    private readonly getComplaintTool: GetComplaintTool,
    private readonly updateComplaintStatusTool: UpdateComplaintStatusTool,
    private readonly createOutingTool: CreateOutingTool,
    private readonly getMyOutingsTool: GetMyOutingsTool,
    private readonly getAllOutingsTool: GetAllOutingsTool,
    private readonly getOutingTool: GetOutingTool,
    private readonly updateOutingStatusTool: UpdateOutingStatusTool,
    private readonly getAllOutingRequestsTool: GetAllOutingRequestsTool,
    private readonly getMyProfileTool: GetMyProfileTool,
    private readonly getMyRoomTool: GetMyRoomTool,
    private readonly getStudentProfileTool: GetStudentProfileTool,
    private readonly getAllStudentsTool: GetAllStudentsTool,
    private readonly getStudentsInRoomTool: GetStudentsInRoomTool,
    private readonly assignRoomTool: AssignRoomTool,
    private readonly getFoodMenuTool: GetFoodMenuTool,
    private readonly getFoodMenuWeekTool: GetFoodMenuWeekTool,
    private readonly createFoodMenuTool: CreateFoodMenuTool,
    private readonly getAllRoomsTool: GetAllRoomsTool,
    private readonly getAvailableRoomsTool: GetAvailableRoomsTool,
    private readonly getRoomDetailsTool: GetRoomDetailsTool,
    private readonly createRoomTool: CreateRoomTool,
    private readonly markAttendanceTool: MarkAttendanceTool,
  ) {
    this.toolRegistry.register(this.attendanceTools);
    this.toolRegistry.register(this.getStudentAttendanceTool);
    this.toolRegistry.register(this.updateAttendanceTool);
    this.toolRegistry.register(this.getAllAttendanceTool);
    this.toolRegistry.register(this.createComplaintTool);
    this.toolRegistry.register(this.getMyComplaintsTool);
    this.toolRegistry.register(this.getAllComplaintsTool);
    this.toolRegistry.register(this.getComplaintTool);
    this.toolRegistry.register(this.updateComplaintStatusTool);
    this.toolRegistry.register(this.createOutingTool);
    this.toolRegistry.register(this.getMyOutingsTool);
    this.toolRegistry.register(this.getAllOutingsTool);
    this.toolRegistry.register(this.getOutingTool);
    this.toolRegistry.register(this.updateOutingStatusTool);
    this.toolRegistry.register(this.getAllOutingRequestsTool);
    this.toolRegistry.register(this.getMyProfileTool);
    this.toolRegistry.register(this.getMyRoomTool);
    this.toolRegistry.register(this.getStudentProfileTool);
    this.toolRegistry.register(this.getAllStudentsTool);
    this.toolRegistry.register(this.getStudentsInRoomTool);
    this.toolRegistry.register(this.assignRoomTool);
    this.toolRegistry.register(this.getFoodMenuTool);
    this.toolRegistry.register(this.getFoodMenuWeekTool);
    this.toolRegistry.register(this.createFoodMenuTool);
    this.toolRegistry.register(this.getAllRoomsTool);
    this.toolRegistry.register(this.getAvailableRoomsTool);
    this.toolRegistry.register(this.getRoomDetailsTool);
    this.toolRegistry.register(this.createRoomTool);
    this.toolRegistry.register(this.markAttendanceTool);
  }
}
