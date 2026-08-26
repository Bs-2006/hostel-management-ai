import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';

@Module({
  imports: [AuthModule], // provides JwtModule for JwtGuard
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
