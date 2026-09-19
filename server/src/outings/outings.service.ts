import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOutingDto } from './dto/outing.dto.js';

@Injectable()
export class OutingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOutingDto, requestingUser: { sub: number; role: string }) {
    const db = this.prisma.client;

    // Must be a student
    if (this.normalizeRole(requestingUser.role) !== 'STUDENT') {
      throw new ForbiddenException('Only students can create outing requests');
    }

    // Find the student record linked to this user
    const student = await db.orm.public.Student.where({ userId: requestingUser.sub }).first();
    if (!student) throw new NotFoundException('Student profile not found for this user');

    return db.orm.public.Outing.create({
      ...dto,
      status: 'Pending',
      studentId: student.id,
    });
  }

  async findAll(requestingUser: { sub: number; role: string }) {
    const db = this.prisma.client;

    if (this.normalizeRole(requestingUser.role) === 'WARDEN') {
      return db.orm.public.Outing.all();
    }

    // Student sees only their own outings
    const student = await db.orm.public.Student.where({ userId: requestingUser.sub }).first();
    if (!student) throw new NotFoundException('Student profile not found');

    return db.orm.public.Outing.where({ studentId: student.id }).all();
  }

  /**
   * Returns all outings (WARDEN only), each enriched with the requesting
   * student's name and student ID so the agent can present them clearly.
   */
  async findAllWithStudents(requestingUser: { sub: number; role: string }) {
    const db = this.prisma.client;
    const outings = await this.findAll(requestingUser);

    return Promise.all(
      outings.map(async (o) => {
        const student = await db.orm.public.Student.where({ id: o.studentId }).first();
        const user = student
          ? await db.orm.public.User.where({ id: student.userId }).first()
          : null;
        return {
          ...o,
          student: student
            ? { id: student.id, name: user?.name ?? null, email: user?.email ?? null }
            : null,
        };
      }),
    );
  }

  private normalizeRole(role: string): string {
    return String(role).trim().toUpperCase();
  }

  async findOne(id: number, requestingUser: { sub: number; role: string }) {
    const db = this.prisma.client;
    const outing = await db.orm.public.Outing.where({ id }).first();
    if (!outing) throw new NotFoundException(`Outing #${id} not found`);

    if (this.normalizeRole(requestingUser.role) === 'STUDENT') {
      const student = await db.orm.public.Student.where({ userId: requestingUser.sub }).first();
      if (!student || outing.studentId !== student.id) {
        throw new ForbiddenException('You can only view your own outing requests');
      }
    }

    return outing;
  }

  async updateStatus(id: number, status: 'Approved' | 'Rejected') {
    const db = this.prisma.client;
    const outing = await db.orm.public.Outing.where({ id }).first();
    if (!outing) throw new NotFoundException(`Outing #${id} not found`);

    if (outing.status !== 'Pending') {
      throw new UnprocessableEntityException(
        `Outing #${id} is already ${outing.status} and cannot be changed`,
      );
    }

    return db.orm.public.Outing.where({ id }).update({ status });
  }
}
