import { Module } from '@nestjs/common';

import { AuraModule } from './aura/aura.module';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
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
import { StaffModule } from './staff/staff.module';
import { AdminModule } from './admin/admin.module';
import { TrendingModule } from './trending/trending.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { ContactModule } from './contact/contact.module';

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
    MailModule,
    MediaModule,
    AuraModule,
    TrendingModule,
    HealthModule,
    AuthModule,
    FeedModule,
    LikesModule,
    CommentsModule,
    PostsModule,
    LeaderboardModule,
    UsersModule,
    SafetyModule,
    StaffModule,
    AdminModule,
    ModerationModule,
    WaitlistModule,
    ContactModule,
  ],
})
export class AppModule {}
