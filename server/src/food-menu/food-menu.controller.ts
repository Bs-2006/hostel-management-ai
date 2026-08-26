import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
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

import { JwtGuard } from '../common/guards/jwt.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { FoodMenuService } from './food-menu.service.js';
import { CreateFoodMenuDto, UpdateFoodMenuDto } from './dto/food-menu.dto.js';

@ApiTags('Food Menu')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('food-menu')
export class FoodMenuController {
  constructor(private readonly foodMenuService: FoodMenuService) {}

  // POST /food-menu — warden only
  @Roles('warden')
  @ApiOperation({ summary: 'Create a food menu for a day (warden only)' })
  @ApiCreatedResponse({ description: 'Food menu created' })
  @ApiConflictResponse({ description: 'Menu for this day already exists' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Warden role required' })
  @Post()
  create(@Body() dto: CreateFoodMenuDto) {
    return this.foodMenuService.create(dto);
  }

  // GET /food-menu — any authenticated user
  @ApiOperation({ summary: 'Get all food menus (warden and student)' })
  @ApiOkResponse({ description: 'List of all food menus' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @Get()
  findAll() {
    return this.foodMenuService.findAll();
  }

  // GET /food-menu/:id — any authenticated user
  @ApiOperation({ summary: 'Get a food menu by ID (warden and student)' })
  @ApiParam({ name: 'id', description: 'Food menu ID' })
  @ApiOkResponse({ description: 'Food menu details' })
  @ApiNotFoundResponse({ description: 'Food menu not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.foodMenuService.findOne(id);
  }

  // PATCH /food-menu/:id — warden only
  @Roles('warden')
  @ApiOperation({ summary: 'Update a food menu (warden only)' })
  @ApiParam({ name: 'id', description: 'Food menu ID' })
  @ApiOkResponse({ description: 'Food menu updated' })
  @ApiNotFoundResponse({ description: 'Food menu not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Warden role required' })
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFoodMenuDto) {
    return this.foodMenuService.update(id, dto);
  }

  // DELETE /food-menu/:id — warden only
  @Roles('warden')
  @ApiOperation({ summary: 'Delete a food menu (warden only)' })
  @ApiParam({ name: 'id', description: 'Food menu ID' })
  @ApiOkResponse({ description: 'Food menu deleted' })
  @ApiNotFoundResponse({ description: 'Food menu not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Warden role required' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.foodMenuService.remove(id);
  }
}
