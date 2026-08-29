import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { StaffAuthGuard } from '../staff/staff-auth.guard';
import { StaffRoles } from '../staff/staff-roles.decorator';
import { StaffRolesGuard } from '../staff/staff-roles.guard';

import { ADMIN_PAGE_SIZE, AdminService } from './admin.service';

const pageSchema = z.object({
  q: z.string().max(120).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(ADMIN_PAGE_SIZE),
});

const usersQuerySchema = pageSchema.extend({
  status: z.enum(['active', 'suspended', 'banned']).optional(),
});

const postsQuerySchema = pageSchema.extend({
  status: z.enum(['uploading', 'processing', 'published', 'failed', 'removed']).optional(),
});

@Controller('admin')
@UseGuards(StaffAuthGuard, StaffRolesGuard)
@StaffRoles('owner', 'admin', 'moderator')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('users')
  listUsers(@Query() query: Record<string, string | undefined>) {
    return this.admin.listUsers(usersQuerySchema.parse(query));
  }

  @Get('users/:id/posts')
  listUserPosts(@Param('id') userId: string, @Query() query: Record<string, string | undefined>) {
    return this.admin.listUserPosts(userId, pageSchema.parse(query));
  }

  @Get('users/:id')
  getUser(@Param('id') userId: string) {
    return this.admin.getUser(userId);
  }

  @Get('posts')
  listPosts(@Query() query: Record<string, string | undefined>) {
    return this.admin.listPosts(postsQuerySchema.parse(query));
  }
}
