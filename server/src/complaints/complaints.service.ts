import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ComplaintStatus, CreateComplaintDto, UpdateComplaintStatusDto } from './dto/complaint.dto.js';

@Injectable()
export class ComplaintsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateComplaintDto, requestingUser: { sub: number; role: string }) {
    if (requestingUser.role !== 'student') {
      throw new ForbiddenException('Only students can create complaints');
    }

    const db = this.prisma.client;
    const student = await db.orm.public.Student.where({ userId: requestingUser.sub }).first();
    if (!student) throw new NotFoundException('Student profile not found for this user');

    return db.orm.public.Complaint.create({
      title: dto.title,
      description: dto.description,
      status: ComplaintStatus.PENDING,
      studentId: student.id,
    });
  }

  async findAll() {
    const db = this.prisma.client;
    const complaints = await db.orm.public.Complaint.all();

    return Promise.all(
      complaints.map(async (c) => {
        const student = await db.orm.public.Student.where({ id: c.studentId }).first();
        const user = student
          ? await db.orm.public.User.where({ id: student.userId }).first()
          : null;
        const { password: _pw, ...safeUser } = user ?? ({} as any);
        return { ...c, student: student ? { ...student, user: safeUser } : null };
      }),
    );
  }

  async findMine(requestingUser: { sub: number; role: string }) {
    if (requestingUser.role !== 'student') {
      throw new ForbiddenException('Only students can list their own complaints');
    }

    const db = this.prisma.client;
    const student = await db.orm.public.Student.where({ userId: requestingUser.sub }).first();
    if (!student) throw new NotFoundException('Student profile not found for this user');

    const complaints = await db.orm.public.Complaint.where({ studentId: student.id }).all();
    return complaints.map((c) => ({ ...c, student }));
  }

  async findOne(id: number) {
    const db = this.prisma.client;
    const complaint = await db.orm.public.Complaint.where({ id }).first();
    if (!complaint) throw new NotFoundException(`Complaint #${id} not found`);

    const student = await db.orm.public.Student.where({ id: complaint.studentId }).first();
    const user = student
      ? await db.orm.public.User.where({ id: student.userId }).first()
      : null;
    const { password: _pw, ...safeUser } = user ?? ({} as any);
    return { ...complaint, student: student ? { ...student, user: safeUser } : null };
  }

  async updateStatus(id: number, dto: UpdateComplaintStatusDto) {
    const db = this.prisma.client;
    const complaint = await db.orm.public.Complaint.where({ id }).first();
    if (!complaint) throw new NotFoundException(`Complaint #${id} not found`);

    return db.orm.public.Complaint.where({ id }).update({ status: dto.status });
  }
}
