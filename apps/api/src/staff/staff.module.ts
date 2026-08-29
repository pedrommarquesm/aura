import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { StaffAuthController } from './staff-auth.controller';
import { StaffAuthGuard } from './staff-auth.guard';
import { StaffRolesGuard } from './staff-roles.guard';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { StaffTokensService } from './staff-tokens.service';

@Module({
  imports: [AuthModule],
  controllers: [StaffAuthController, StaffController],
  providers: [StaffService, StaffTokensService, StaffAuthGuard, StaffRolesGuard],
  exports: [StaffService, StaffTokensService, StaffAuthGuard, StaffRolesGuard],
})
export class StaffModule {}
