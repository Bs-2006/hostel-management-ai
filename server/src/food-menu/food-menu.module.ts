import { Module } from '@nestjs/common';
import { FoodMenuController } from './food-menu.controller.js';
import { FoodMenuService } from './food-menu.service.js';

@Module({
  controllers: [FoodMenuController],
  providers: [FoodMenuService]
})
export class FoodMenuModule {}
