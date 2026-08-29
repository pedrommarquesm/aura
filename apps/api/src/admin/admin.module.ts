import { Module } from '@nestjs/common';

import { StaffModule } from '../staff/staff.module';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [StaffModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
