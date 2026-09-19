import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FoodMenuController } from './food-menu.controller.js';
import { FoodMenuService } from './food-menu.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FoodMenuController],
  providers: [FoodMenuService],
  exports: [FoodMenuService],
})
export class FoodMenuModule {}
