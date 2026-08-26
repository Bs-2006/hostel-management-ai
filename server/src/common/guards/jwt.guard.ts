import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Missing token');

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: process.env['JWT_SECRET'] ?? 'fallback-secret',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Attach user to request
    (req as any).user = payload;

    // Check roles if @Roles() is set on the handler
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredRoles && !requiredRoles.includes(payload.role)) {
      throw new UnauthorizedException('Insufficient permissions');
    }

    return true;
  }

  private extractToken(req: Request): string | null {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
