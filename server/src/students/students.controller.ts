import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
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
import { StudentsService } from './students.service.js';
import { AssignRoomDto, UpdateStudentDto } from './dto/student.dto.js';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // POST /students — warden only (student registration is handled via /auth/register)
  @Roles('warden')
  @ApiCreatedResponse({ description: 'Student created (use POST /auth/register instead)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Warden role required' })
  @Post()
  create() {
    return { message: 'Use POST /auth/register with role: "student" to create a student' };
  }

  // GET /students — warden only
  @Roles('warden')
  @ApiOkResponse({ description: 'List of all students' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Warden role required' })
  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  // GET /students/:id — warden or the student themselves
  @ApiOkResponse({ description: 'Student details' })
  @ApiNotFoundResponse({ description: 'Student not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = (req as any).user;
    const student = await this.studentsService.findOne(id);
    if (user.role === 'student' && student.userId !== user.sub) {
      throw new ForbiddenException('You can only view your own profile');
    }
    return student;
  }

  // PATCH /students/:id — warden or the student themselves
  @ApiOkResponse({ description: 'Updated student' })
  @ApiNotFoundResponse({ description: 'Student not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentDto,
    @Req() req: Request,
  ) {
    return this.studentsService.update(id, dto, (req as any).user);
  }

  // PATCH /students/:id/room — warden only
  @Roles('warden')
  @ApiOperation({ summary: 'Assign a room to a student' })
  @ApiParam({ name: 'id', description: 'Student ID', example: 7 })
  @ApiBody({ type: AssignRoomDto })
  @ApiOkResponse({ description: 'Room assigned successfully, returns updated student with room info' })
  @ApiNotFoundResponse({ description: 'Student or room not found' })
  @ApiConflictResponse({ description: 'Student already in this room, or room is full' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Warden role required' })
  @Patch(':id/room')
  assignRoom(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignRoomDto) {
    return this.studentsService.assignRoom(id, dto);
  }

  // DELETE /students/:id — warden only
  @Roles('warden')
  @ApiOkResponse({ description: 'Student deleted' })
  @ApiNotFoundResponse({ description: 'Student not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Warden role required' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.remove(id);
  }
}
