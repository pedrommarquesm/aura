import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { AppError } from '../common/errors/app-error';

import { StaffAuthGuard, type StaffRequest } from './staff-auth.guard';
import { StaffRoles } from './staff-roles.decorator';
import { StaffRolesGuard } from './staff-roles.guard';
import { StaffService } from './staff.service';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'moderator']),
  displayName: z.string().max(80).optional(),
});

const updateSchema = z
  .object({
    role: z.enum(['admin', 'moderator']).optional(),
    status: z.enum(['invited', 'active', 'deactivated']).optional(),
    displayName: z.string().max(80).nullable().optional(),
  })
  .refine((value) => value.role !== undefined || value.status !== undefined || value.displayName !== undefined, {
    message: 'At least one field is required',
  });

@Controller('staff')
@UseGuards(StaffAuthGuard, StaffRolesGuard)
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  @StaffRoles('owner', 'admin')
  async list() {
    return { items: await this.staff.list() };
  }

  @Post()
  @StaffRoles('owner', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async invite(@Body() body: unknown, @Req() request: StaffRequest) {
    if (!request.staff) throw AppError.unauthorized();
    const input = inviteSchema.parse(body);
    return {
      staff: await this.staff.invite(request.staff, {
        email: input.email,
        role: input.role,
        displayName: input.displayName,
      }),
    };
  }

  @Patch(':id')
  @StaffRoles('owner', 'admin')
  async update(@Param('id') staffId: string, @Body() body: unknown, @Req() request: StaffRequest) {
    if (!request.staff) throw AppError.unauthorized();
    const input = updateSchema.parse(body);
    return { staff: await this.staff.update(request.staff, staffId, input) };
  }
}
