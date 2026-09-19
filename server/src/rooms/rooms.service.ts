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
    // Return rooms enriched with occupants so mobile list and AI can show who is present
    return this.findWithOccupants();
  }

  async findOne(id: number) {
    const db = this.prisma.client;
    const room = await db.orm.public.Room.where({ id }).first();
    if (!room) throw new NotFoundException(`Room #${id} not found`);
    // Always include occupants so mobile detail screen and AI can display students present
    const students = await db.orm.public.Student.where({ roomId: room.id }).all();
    const occupants = await Promise.all(
      students.map(async (s) => {
        const user = await db.orm.public.User.where({ id: s.userId }).first();
        const { password: _pw, ...safeUser } = user!;
        return { name: safeUser.name, userId: safeUser.id, rollNumber: s.rollNumber, branch: s.branch, year: s.year };
      }),
    );
    return { ...room, occupants };
  }

  async findByRoomNumber(roomNumber: string) {
    const db = this.prisma.client;
    const room = await db.orm.public.Room.where({ roomNumber }).first();
    if (!room) throw new NotFoundException(`Room ${roomNumber} not found`);
    return room;
  }

  async findAvailable() {
    const db = this.prisma.client;
    const rooms = await db.orm.public.Room.all();
    const available = rooms.filter((r) => r.occupied < r.capacity);
    // Enrich with occupants so the AI can display who is currently in each room
    return Promise.all(
      available.map(async (room) => {
        const students = await db.orm.public.Student.where({ roomId: room.id }).all();
        const occupants = await Promise.all(
          students.map(async (s) => {
            const user = await db.orm.public.User.where({ id: s.userId }).first();
            const { password: _pw, ...safeUser } = user!;
            return { name: safeUser.name, userId: safeUser.id, rollNumber: s.rollNumber, branch: s.branch, year: s.year };
          }),
        );
        return { ...room, occupants };
      }),
    );
  }

  async findWithOccupants(roomNumber?: string) {
    const db = this.prisma.client;
    let rooms = await db.orm.public.Room.all();
    if (roomNumber) {
      rooms = rooms.filter((r) => r.roomNumber.toLowerCase() === roomNumber.trim().toLowerCase());
    }
    return Promise.all(
      rooms.map(async (room) => {
        const students = await db.orm.public.Student.where({ roomId: room.id }).all();
        const occupants = await Promise.all(
          students.map(async (s) => {
            const user = await db.orm.public.User.where({ id: s.userId }).first();
            const { password: _pw, ...safeUser } = user!;
            return { name: safeUser.name, userId: safeUser.id, rollNumber: s.rollNumber, branch: s.branch, year: s.year };
          }),
        );
        return { ...room, occupants };
      }),
    );
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
