import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppError } from '../common/errors/app-error';

import type { StaffRole } from './staff-access';
import type { StaffRequest } from './staff-auth.guard';
import { STAFF_ROLES_KEY } from './staff-roles.decorator';

@Injectable()
export class StaffRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<StaffRole[] | undefined>(STAFF_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest<StaffRequest>();
    const role = request.staff?.role;

    if (!role || !roles.includes(role)) {
      throw AppError.forbidden('Your role cannot do that');
    }

    return true;
  }
}
