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
    if (requestingUser.role !== 'student') {
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

    if (requestingUser.role === 'warden') {
      return db.orm.public.Outing.all();
    }

    // Student sees only their own outings
    const student = await db.orm.public.Student.where({ userId: requestingUser.sub }).first();
    if (!student) throw new NotFoundException('Student profile not found');

    return db.orm.public.Outing.where({ studentId: student.id }).all();
  }

  async findOne(id: number, requestingUser: { sub: number; role: string }) {
    const db = this.prisma.client;
    const outing = await db.orm.public.Outing.where({ id }).first();
    if (!outing) throw new NotFoundException(`Outing #${id} not found`);

    if (requestingUser.role === 'student') {
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
