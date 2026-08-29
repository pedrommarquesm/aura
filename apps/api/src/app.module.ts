import { Module } from '@nestjs/common';

import { AuraModule } from './aura/aura.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { DbModule } from './db/db.module';
import { FeedModule } from './feed/feed.module';
import { HealthModule } from './health/health.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { LikesModule } from './likes/likes.module';
import { MediaModule } from './media/media.module';
import { ModerationModule } from './moderation/moderation.module';
import { PostsModule } from './posts/posts.module';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from './redis/redis.module';
import { SafetyModule } from './safety/safety.module';
import { TrendingModule } from './trending/trending.module';
import { UsersModule } from './users/users.module';

/**
 * Shared by the HTTP process and the worker process.
 *
 * Both run the same image with a different entry point, which keeps domain
 * code in one place while letting the two scale independently — media
 * processing is CPU-heavy and must never slow down a like.
 */
@Module({
  imports: [
    ConfigModule,
    DbModule,
    RedisModule,
    QueueModule,
    MediaModule,
    AuraModule,
    TrendingModule,
    HealthModule,
    AuthModule,
    FeedModule,
    LikesModule,
    PostsModule,
    LeaderboardModule,
    UsersModule,
    SafetyModule,
    ModerationModule,
  ],
})
export class AppModule {}
