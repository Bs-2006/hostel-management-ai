import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAttendanceDto, UpdateAttendanceDto } from './dto/attendance.dto.js';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAttendanceDto) {
    const db = this.prisma.client;

    // Student must exist
    const student = await db.orm.public.Student.where({ id: dto.studentId }).first();
    if (!student) throw new NotFoundException(`Student #${dto.studentId} not found`);

    // Prevent duplicate attendance for the same student+date
    const existing = await db.orm.public.Attendance
      .where({ studentId: dto.studentId, date: dto.date })
      .first();
    if (existing) {
      throw new ConflictException(
        `Attendance for student #${dto.studentId} on ${dto.date} already exists`,
      );
    }

    return db.orm.public.Attendance.create({
      studentId: dto.studentId,
      date: dto.date,
      status: dto.status,
    });
  }

  async findAll() {
    const db = this.prisma.client;
    const records = await db.orm.public.Attendance.all();
    return this.enrichMany(records);
  }

  async findByStudent(
    studentId: number,
    requestingUser: { sub: number; role: string },
  ) {
    const db = this.prisma.client;

    // If student role, ensure they can only view their own attendance
    if (requestingUser.role === 'student') {
      const student = await db.orm.public.Student.where({ userId: requestingUser.sub }).first();
      if (!student || student.id !== studentId) {
        throw new ForbiddenException('You can only view your own attendance');
      }
    }

    const target = await db.orm.public.Student.where({ id: studentId }).first();
    if (!target) throw new NotFoundException(`Student #${studentId} not found`);

    const records = await db.orm.public.Attendance.where({ studentId }).all();
    return this.enrichMany(records);
  }

  async update(id: number, dto: UpdateAttendanceDto) {
    const db = this.prisma.client;
    const record = await db.orm.public.Attendance.where({ id }).first();
    if (!record) throw new NotFoundException(`Attendance #${id} not found`);

    return db.orm.public.Attendance.where({ id }).update({ status: dto.status });
  }

  // Enrich attendance records with student + user info
  private async enrichMany(records: any[]) {
    const db = this.prisma.client;
    return Promise.all(
      records.map(async (a) => {
        const student = await db.orm.public.Student.where({ id: a.studentId }).first();
        const user = student
          ? await db.orm.public.User.where({ id: student.userId }).first()
          : null;
        const { password: _pw, ...safeUser } = user ?? ({} as any);
        return { ...a, student: student ? { ...student, user: safeUser } : null };
      }),
    );
  }
}
