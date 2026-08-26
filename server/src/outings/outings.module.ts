import { Module } from '@nestjs/common';
import { OutingsController } from './outings.controller.js';
import { OutingsService } from './outings.service.js';

@Module({
  controllers: [OutingsController],
  providers: [OutingsService]
})
export class OutingsModule {}
