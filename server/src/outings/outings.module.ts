import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { OutingsController } from './outings.controller.js';
import { OutingsService } from './outings.service.js';

@Module({
  imports: [AuthModule],
  controllers: [OutingsController],
  providers: [OutingsService],
})
export class OutingsModule {}
