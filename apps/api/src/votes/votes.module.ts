import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { SafetyModule } from '../safety/safety.module';

import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';

@Module({
  imports: [AuthModule, LeaderboardModule, SafetyModule],
  controllers: [VotesController],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}
