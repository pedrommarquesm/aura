import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { StaffModule } from '../staff/staff.module';

import { ModerationController } from './moderation.controller';
import { ModerationGuard } from './moderation.guard';
import { ModerationService } from './moderation.service';

@Module({
  imports: [AuthModule, LeaderboardModule, StaffModule],
  controllers: [ModerationController],
  providers: [ModerationGuard, ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
