import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FeedModule } from '../feed/feed.module';
import { ModerationModule } from '../moderation/moderation.module';

import { PostsController } from './posts.controller';

@Module({
  imports: [AuthModule, FeedModule, ModerationModule],
  controllers: [PostsController],
})
export class PostsModule {}
