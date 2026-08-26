import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssignRoomDto, UpdateStudentDto } from './dto/student.dto.js';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const db = this.prisma.client;
    const students = await db.orm.public.Student.all();

    // Enrich each student with user info
    return Promise.all(
      students.map(async (s) => {
        const user = await db.orm.public.User.where({ id: s.userId }).first();
        const room = s.roomId ? await db.orm.public.Room.where({ id: s.roomId }).first() : null;
        const { password: _pw, ...safeUser } = user!;
        return { ...s, user: safeUser, room };
      }),
    );
  }

  async findOne(id: number) {
    const db = this.prisma.client;
    const student = await db.orm.public.Student.where({ id }).first();
    if (!student) throw new NotFoundException(`Student #${id} not found`);

    const user = await db.orm.public.User.where({ id: student.userId }).first();
    const room = student.roomId
      ? await db.orm.public.Room.where({ id: student.roomId }).first()
      : null;

    const { password: _pw, ...safeUser } = user!;
    return { ...student, user: safeUser, room };
  }

  async update(
    id: number,
    dto: UpdateStudentDto,
    requestingUser: { sub: number; role: string },
  ) {
    const db = this.prisma.client;
    const student = await db.orm.public.Student.where({ id }).first();
    if (!student) throw new NotFoundException(`Student #${id} not found`);

    if (requestingUser.role === 'student' && student.userId !== requestingUser.sub) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const updated = await db.orm.public.Student.where({ id }).update(dto);
    return updated;
  }

  async remove(id: number) {
    const db = this.prisma.client;
    const student = await db.orm.public.Student.where({ id }).first();
    if (!student) throw new NotFoundException(`Student #${id} not found`);

    await db.orm.public.Student.where({ id }).delete();
    return { message: `Student #${id} deleted` };
  }

  async assignRoom(studentId: number, dto: AssignRoomDto) {
    const db = this.prisma.client;

    // 1. Student must exist
    const student = await db.orm.public.Student.where({ id: studentId }).first();
    if (!student) throw new NotFoundException(`Student #${studentId} not found`);

    // 2. Room must exist
    const room = await db.orm.public.Room.where({ id: dto.roomId }).first();
    if (!room) throw new NotFoundException(`Room #${dto.roomId} not found`);

    // 3. Student already in this room
    if (student.roomId === dto.roomId) {
      throw new ConflictException(`Student #${studentId} is already assigned to room ${room.roomNumber}`);
    }

    // 4. Check capacity — count students currently assigned to this room
    const occupants = await db.orm.public.Student.where({ roomId: dto.roomId }).all();
    if (occupants.length >= room.capacity) {
      throw new ConflictException(`Room ${room.roomNumber} is already full`);
    }

    // 5. If student was in another room, decrement that room's occupied count
    if (student.roomId) {
      const prevOccupied = await db.orm.public.Student.where({ roomId: student.roomId }).all();
      await db.orm.public.Room.where({ id: student.roomId }).update({
        occupied: Math.max(0, prevOccupied.length - 1),
      });
    }

    // 6. Assign new room and bump occupied count
    await db.orm.public.Student.where({ id: studentId }).update({ roomId: dto.roomId });
    await db.orm.public.Room.where({ id: dto.roomId }).update({
      occupied: occupants.length + 1,
    });

    // 7. Return enriched student
    const updatedStudent = await db.orm.public.Student.where({ id: studentId }).first();
    const user = await db.orm.public.User.where({ id: updatedStudent!.userId }).first();
    const { password: _pw, ...safeUser } = user!;
    return { ...updatedStudent, user: safeUser, room };
  }
}
