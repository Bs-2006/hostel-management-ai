import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';

import { AuthController, UsersController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env['JWT_SECRET'] ?? 'fallback-secret',
      signOptions: { expiresIn: (process.env['JWT_EXPIRES_IN'] ?? '7d') as StringValue },
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
