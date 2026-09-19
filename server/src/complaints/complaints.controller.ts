import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { ComplaintsService } from './complaints.service.js';
import { CreateComplaintDto, UpdateComplaintStatusDto } from './dto/complaint.dto.js';

@ApiTags('Complaints')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  // POST /complaints — student only
  @Roles('student')
  @ApiOperation({ summary: 'Create a complaint (student only)' })
  @ApiCreatedResponse({ description: 'Complaint created with status PENDING' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Student role required' })
  @Post()
  create(@Body() dto: CreateComplaintDto, @Req() req: Request) {
    return this.complaintsService.create(dto, (req as any).user);
  }

  // GET /complaints — warden only
  @Roles('warden')
  @ApiOperation({ summary: 'Get all complaints with student info (warden only)' })
  @ApiOkResponse({ description: 'List of all complaints' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Warden role required' })
  @Get()
  findAll() {
    return this.complaintsService.findAll();
  }

  // GET /complaints/my — student only (their own complaints)
  @ApiOperation({ summary: 'Get the current student\'s complaints (student only)' })
  @ApiOkResponse({ description: 'List of complaints submitted by the current student' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Student role required' })
  @Get('my')
  findMine(@Req() req: Request) {
    return this.complaintsService.findMine((req as any).user);
  }

  // GET /complaints/:id — warden only
  @Roles('warden')
  @ApiOperation({ summary: 'Get a complaint by ID (warden only)' })
  @ApiParam({ name: 'id', description: 'Complaint ID' })
  @ApiOkResponse({ description: 'Complaint details with student info' })
  @ApiNotFoundResponse({ description: 'Complaint not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Warden role required' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.complaintsService.findOne(id);
  }

  // PATCH /complaints/:id — warden only
  @Roles('warden')
  @ApiOperation({ summary: 'Update complaint status (warden only)' })
  @ApiParam({ name: 'id', description: 'Complaint ID' })
  @ApiOkResponse({ description: 'Complaint status updated' })
  @ApiNotFoundResponse({ description: 'Complaint not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Warden role required' })
  @Patch(':id')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateComplaintStatusDto) {
    return this.complaintsService.updateStatus(id, dto);
  }
}
