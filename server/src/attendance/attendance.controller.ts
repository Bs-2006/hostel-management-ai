import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtGuard } from '../common/guards/jwt.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AttendanceService } from './attendance.service.js';
import { CreateAttendanceDto, UpdateAttendanceDto } from './dto/attendance.dto.js';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // POST /attendance — warden only
  @Roles('warden')
  @ApiOperation({ summary: 'Mark attendance for a student (warden only)' })
  @ApiCreatedResponse({ description: 'Attendance record created' })
  @ApiConflictResponse({ description: 'Attendance already marked for this student on this date' })
  @ApiNotFoundResponse({ description: 'Student not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Warden role required' })
  @Post()
  create(@Body() dto: CreateAttendanceDto) {
    return this.attendanceService.create(dto);
  }

  // GET /attendance — warden only
  @Roles('warden')
  @ApiOperation({ summary: 'Get all attendance records (warden only)' })
  @ApiOkResponse({ description: 'All attendance records with student info' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Warden role required' })
  @Get()
  findAll() {
    return this.attendanceService.findAll();
  }

  // GET /attendance/student/:studentId — warden or own student
  @ApiOperation({ summary: 'Get attendance for a specific student (warden: any, student: own only)' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiOkResponse({ description: 'Attendance records for the student' })
  @ApiNotFoundResponse({ description: 'Student not found' })
  @ApiForbiddenResponse({ description: 'Students can only view their own attendance' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @Get('student/:studentId')
  findByStudent(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Req() req: Request,
  ) {
    return this.attendanceService.findByStudent(studentId, (req as any).user);
  }

  // PATCH /attendance/:id — warden only
  @Roles('warden')
  @ApiOperation({ summary: 'Update an attendance record (warden only)' })
  @ApiParam({ name: 'id', description: 'Attendance ID' })
  @ApiOkResponse({ description: 'Attendance updated' })
  @ApiNotFoundResponse({ description: 'Attendance record not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Warden role required' })
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAttendanceDto) {
    return this.attendanceService.update(id, dto);
  }
}
