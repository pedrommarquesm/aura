import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';

@Module({
  imports: [AuthModule, LeaderboardModule],
  controllers: [LikesController],
  providers: [LikesService],
  exports: [LikesService],
})
export class LikesModule {}
