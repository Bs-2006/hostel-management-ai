import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Usage: @Roles('warden') or @Roles('student', 'warden') */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
