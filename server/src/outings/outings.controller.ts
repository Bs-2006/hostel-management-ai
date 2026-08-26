import {
  Body,
  Controller,
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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtGuard } from '../common/guards/jwt.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { OutingsService } from './outings.service.js';
import { CreateOutingDto } from './dto/outing.dto.js';

@ApiTags('Outings')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('outings')
export class OutingsController {
  constructor(private readonly outingsService: OutingsService) {}

  // POST /outings — student only
  @Roles('student')
  @ApiOperation({ summary: 'Create an outing request (student only)' })
  @ApiCreatedResponse({ description: 'Outing request created with status Pending' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Student role required' })
  @Post()
  create(@Body() dto: CreateOutingDto, @Req() req: Request) {
    return this.outingsService.create(dto, (req as any).user);
  }

  // GET /outings — warden sees all, student sees own
  @ApiOperation({ summary: 'Get outings (warden: all, student: own)' })
  @ApiOkResponse({ description: 'List of outing requests' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @Get()
  findAll(@Req() req: Request) {
    return this.outingsService.findAll((req as any).user);
  }

  // GET /outings/:id — warden sees any, student sees own
  @ApiOperation({ summary: 'Get a single outing request' })
  @ApiParam({ name: 'id', description: 'Outing ID' })
  @ApiOkResponse({ description: 'Outing details' })
  @ApiNotFoundResponse({ description: 'Outing not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.outingsService.findOne(id, (req as any).user);
  }

  // PATCH /outings/:id/approve — warden only
  @Roles('warden')
  @ApiOperation({ summary: 'Approve an outing request (warden only)' })
  @ApiParam({ name: 'id', description: 'Outing ID' })
  @ApiOkResponse({ description: 'Outing approved' })
  @ApiNotFoundResponse({ description: 'Outing not found' })
  @ApiForbiddenResponse({ description: 'Warden role required' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.outingsService.updateStatus(id, 'Approved');
  }

  // PATCH /outings/:id/reject — warden only
  @Roles('warden')
  @ApiOperation({ summary: 'Reject an outing request (warden only)' })
  @ApiParam({ name: 'id', description: 'Outing ID' })
  @ApiOkResponse({ description: 'Outing rejected' })
  @ApiNotFoundResponse({ description: 'Outing not found' })
  @ApiForbiddenResponse({ description: 'Warden role required' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @Patch(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.outingsService.updateStatus(id, 'Rejected');
  }
}
