import { Module } from '@nestjs/common';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { AuthModule } from './auth/auth.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { OutingsModule } from './outings/outings.module.js';
import { ComplaintsModule } from './complaints/complaints.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { FoodMenuModule } from './food-menu/food-menu.module.js';
import { AiModule } from './ai/ai.module.js';
import { StudentsModule } from './students/students.module.js';

import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    AuthModule,
    RoomsModule,
    OutingsModule,
    ComplaintsModule,
    AttendanceModule,
    FoodMenuModule,
    AiModule,
    StudentsModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}