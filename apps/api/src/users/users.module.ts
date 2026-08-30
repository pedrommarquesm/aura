import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FeedModule } from '../feed/feed.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

import { AvatarService } from './avatar.service';
import { MeController } from './me.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, FeedModule, LeaderboardModule],
  controllers: [UsersController, MeController],
  providers: [UsersService, AvatarService],
  exports: [UsersService],
})
export class UsersModule {}
