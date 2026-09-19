import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto, RegisterDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const db = this.prisma.client;

    if (!dto.role || !['student', 'warden'].includes(dto.role)) {
      throw new BadRequestException('role must be "student" or "warden"');
    }

    const existing = await db.orm.public.User
      .where({ email: dto.email })
      .first();

    if (existing) throw new ConflictException('Email already in use');

    if (dto.role === 'student') {
      if (!dto.rollNumber || !dto.branch || !dto.year) {
        throw new BadRequestException(
          'rollNumber, branch, and year are required for student registration',
        );
      }
    }

    const hashed = await argon2.hash(dto.password);

    const user = await db.orm.public.User.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      role: dto.role,
    });

    if (dto.role === 'student') {
      await db.orm.public.Student.create({
        rollNumber: dto.rollNumber!,
        branch: dto.branch!,
        year: dto.year!,
        userId: user.id,
      });
    }

    const student = user.role === 'student'
      ? await db.orm.public.Student.where({ userId: user.id }).first()
      : null;

    const token = this.signToken(user.id, user.email, user.role);
    const { password: _pw, ...safeUser } = user;
    return { token, user: { ...safeUser, student } };
  }

  async login(dto: LoginDto) {
    const db = this.prisma.client;

    const user = await db.orm.public.User
      .where({ email: dto.email })
      .first();

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await argon2.verify(user.password, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const student = user.role === 'student'
      ? await db.orm.public.Student.where({ userId: user.id }).first()
      : null;

    const token = this.signToken(user.id, user.email, user.role);
    const { password: _pw, ...safeUser } = user;
    return { token, user: { ...safeUser, student } };
  }

  private signToken(userId: number, email: string, role: string) {
    return this.jwt.sign({ sub: userId, email, role });
  }

  async getMe(jwtPayload: { sub: number; email: string; role: string }) {
    const db = this.prisma.client;

    const user = await db.orm.public.User
      .where({ id: jwtPayload.sub })
      .first();

    if (!user) throw new UnauthorizedException('User not found');

    const student = user.role === 'student'
      ? await db.orm.public.Student.where({ userId: user.id }).first()
      : null;

    const { password: _pw, ...safeUser } = user;
    return { ...safeUser, student };
  }
}
