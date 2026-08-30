import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FeedModule } from '../feed/feed.module';
import { ModerationModule } from '../moderation/moderation.module';

import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [AuthModule, FeedModule, ModerationModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
