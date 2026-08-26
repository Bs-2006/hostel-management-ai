import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto } from './dto/login.dto.js';
import { JwtGuard } from '../common/guards/jwt.guard.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiCreatedResponse({ description: 'User registered successfully' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOkResponse({ description: 'Returns JWT access token' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Returns the current authenticated user' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  @UseGuards(JwtGuard)
  @Get('me')
  getMe(@Req() req: Request) {
    return this.authService.getMe((req as any).user);
  }
}
