import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FeedModule } from '../feed/feed.module';

import { PostsController } from './posts.controller';

@Module({
  imports: [AuthModule, FeedModule],
  controllers: [PostsController],
})
export class PostsModule {}
