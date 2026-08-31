import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { SafetyModule } from '../safety/safety.module';

import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { HashtagsController } from './hashtags.controller';

@Module({
  imports: [AuthModule, SafetyModule],
  controllers: [FeedController, HashtagsController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
