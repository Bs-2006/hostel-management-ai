import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateFoodMenuDto, UpdateFoodMenuDto } from './dto/food-menu.dto.js';

@Injectable()
export class FoodMenuService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFoodMenuDto) {
    const db = this.prisma.client;

    const existing = await db.orm.public.FoodMenu.where({ day: dto.day }).first();
    if (existing) {
      throw new ConflictException(`Food menu for ${dto.day} already exists`);
    }

    return db.orm.public.FoodMenu.create(dto);
  }

  findAll() {
    return this.prisma.client.orm.public.FoodMenu.all();
  }

  async findOne(id: number) {
    const menu = await this.prisma.client.orm.public.FoodMenu.where({ id }).first();
    if (!menu) throw new NotFoundException(`Food menu #${id} not found`);
    return menu;
  }

  async update(id: number, dto: UpdateFoodMenuDto) {
    const db = this.prisma.client;
    const menu = await db.orm.public.FoodMenu.where({ id }).first();
    if (!menu) throw new NotFoundException(`Food menu #${id} not found`);

    return db.orm.public.FoodMenu.where({ id }).update(dto);
  }

  async remove(id: number) {
    const db = this.prisma.client;
    const menu = await db.orm.public.FoodMenu.where({ id }).first();
    if (!menu) throw new NotFoundException(`Food menu #${id} not found`);

    await db.orm.public.FoodMenu.where({ id }).delete();
    return { message: `Food menu #${id} deleted` };
  }
}
