import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto.js';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoomDto) {
    const db = this.prisma.client;

    const existing = await db.orm.public.Room.where({ roomNumber: dto.roomNumber }).first();
    if (existing) throw new ConflictException(`Room ${dto.roomNumber} already exists`);

    return db.orm.public.Room.create({ ...dto, occupied: 0 });
  }

  async findAll() {
    return this.prisma.client.orm.public.Room.all();
  }

  async findOne(id: number) {
    const room = await this.prisma.client.orm.public.Room.where({ id }).first();
    if (!room) throw new NotFoundException(`Room #${id} not found`);
    return room;
  }

  async update(id: number, dto: UpdateRoomDto) {
    const db = this.prisma.client;
    const room = await db.orm.public.Room.where({ id }).first();
    if (!room) throw new NotFoundException(`Room #${id} not found`);

    return db.orm.public.Room.where({ id }).update(dto);
  }

  async remove(id: number) {
    const db = this.prisma.client;
    const room = await db.orm.public.Room.where({ id }).first();
    if (!room) throw new NotFoundException(`Room #${id} not found`);

    await db.orm.public.Room.where({ id }).delete();
    return { message: `Room #${id} deleted` };
  }
}
