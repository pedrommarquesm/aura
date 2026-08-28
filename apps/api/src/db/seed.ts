import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import Redis from 'ioredis';
import postgres from 'postgres';

import { newId } from '../common/ids';
import { loadEnv } from '../config/env';

import * as schema from './schema';
import { auraEvents, likes, mediaAssets, posts, users } from './schema';

/**
 * Development seed.
 *
 * Gives the mobile and web clients something real to render while the upload
 * pipeline is still being built: published posts with media variants, likes,
 * and a matching ledger so Aura totals reconcile instead of being invented.
 *
 * Runs against local and staging. Refuses production, because it truncates.
 *
 * Guarded on APP_ENV rather than NODE_ENV: staging correctly runs
 * `NODE_ENV=production`, so a NODE_ENV check would refuse to seed the one
 * deployed environment that is supposed to carry demo data.
 */
const SAMPLE_USERS = [
  { username: 'alice', title: 'Aura Lord', country: 'PT', city: 'Lisboa' },
  { username: 'joao', title: 'Aura Merchant', country: 'PT', city: 'Porto' },
  { username: 'maria', title: 'Aura Farmer', country: 'PT', city: 'Braga' },
  { username: 'pedro', title: 'Aura Farmer', country: 'PT', city: 'Lisboa' },
  { username: 'sofia', title: 'Aura Enjoyer', country: 'GB', city: 'London' },
  { username: 'nuno', title: 'NPC', country: 'BR', city: 'São Paulo' },
];

const CAPTIONS = [
  'absolute cinema',
  'unbothered. moisturized. in my lane.',
  'the aura is undefeated',
  'caught in 4k being iconic',
  'main character behaviour',
  'coldest post of the week',
  'no thoughts just vibes',
  'this one goes hard',
];

async function main(): Promise<void> {
  const env = loadEnv();

  if (env.APP_ENV === 'production') {
    throw new Error('Refusing to seed a production database');
  }

  console.log(`[seed] target: APP_ENV=${env.APP_ENV}`);

  const client = postgres(env.DATABASE_URL, {
    max: 1,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
    prepare: false,
    onnotice: () => {},
  });

  const db = drizzle(client, { schema });

  try {
    console.log('[seed] clearing existing data');
    await db.delete(auraEvents);
    await db.delete(likes);
    await db.delete(mediaAssets);
    await db.delete(posts);
    await db.delete(users);

    console.log('[seed] creating users');
    const created = await db
      .insert(users)
      .values(
        SAMPLE_USERS.map((user) => ({
          id: newId(),
          username: user.username,
          displayName: user.username[0]!.toUpperCase() + user.username.slice(1),
          title: user.title,
          country: user.country,
          city: user.city,
          locale: user.country === 'PT' ? 'pt' : 'en',
          aura: 0,
        })),
      )
      .returning();

    console.log('[seed] creating posts');
    const createdPosts: Array<{ id: string; authorId: string }> = [];

    for (let index = 0; index < 24; index += 1) {
      const author = created[index % created.length]!;
      const isVideo = index % 5 === 4;
      const postId = newId();
      // Spread over the last few days so the trending recompute has a real
      // recency gradient to work with rather than 24 identical timestamps.
      const publishedAt = new Date(Date.now() - index * 3.5 * 60 * 60 * 1000);

      await db.insert(posts).values({
        id: postId,
        authorId: author.id,
        caption: CAPTIONS[index % CAPTIONS.length]!,
        mediaType: isVideo ? 'video' : 'photo',
        status: 'published',
        publishedAt,
        createdAt: publishedAt,
      });

      const assetId = newId();

      await db.insert(mediaAssets).values({
        id: assetId,
        postId,
        storageProvider: 'r2',
        storageBucket: 'aura-media',
        storageKey: `media/${assetId}/v1/master.${isVideo ? 'mp4' : 'jpg'}`,
        contentType: isVideo ? 'video/mp4' : 'image/jpeg',
        byteSize: isVideo ? 4_200_000 : 320_000,
        width: 1080,
        height: 1350,
        durationMs: isVideo ? 7_400 : null,
        processingStatus: 'ready',
        variants: {
          feed: `media/${assetId}/v1/feed.jpg`,
          thumb: `media/${assetId}/v1/thumb.jpg`,
          ...(isVideo
            ? {
                poster: `media/${assetId}/v1/poster.jpg`,
                hls: `media/${assetId}/v1/index.m3u8`,
              }
            : {}),
        },
      });

      createdPosts.push({ id: postId, authorId: author.id });
    }

    console.log('[seed] creating likes and matching ledger events');
    const BASE_LIKE_AURA = 10;
    let likeTotal = 0;

    for (const [postIndex, post] of createdPosts.entries()) {
      // Newer posts get more likes, so trending has something to rank.
      const likeCount = Math.max(0, 12 - Math.floor(postIndex / 2));

      const voters = created.filter((user) => user.id !== post.authorId).slice(0, likeCount);

      for (const voter of voters) {
        const eventId = newId();
        const createdAt = new Date(Date.now() - postIndex * 60_000);

        await db.insert(auraEvents).values({
          id: eventId,
          userId: post.authorId,
          sourceUserId: voter.id,
          postId: post.id,
          type: 'LIKE',
          amount: BASE_LIKE_AURA,
          idempotencyKey: `like:${voter.id}:${post.id}`,
          createdAt,
        });

        await db.insert(likes).values({
          userId: voter.id,
          postId: post.id,
          auraEventId: eventId,
          createdAt,
        });

        likeTotal += 1;
      }

      await db
        .update(posts)
        .set({
          likeCount: voters.length,
          aura: voters.length * BASE_LIKE_AURA,
          // Stand-in until the worker's first recompute; keeps /feed/trending ordered.
          trendingScore: voters.length * BASE_LIKE_AURA,
        })
        .where(eq(posts.id, post.id));
    }

    // Derive user totals from the ledger rather than tracking them by hand:
    // the seed should obey the same rule as the application.
    console.log('[seed] reconciling Aura totals from the ledger');
    await client`
      UPDATE users u
      SET aura = COALESCE((SELECT SUM(e.amount) FROM aura_events e WHERE e.user_id = u.id), 0)
    `;

    console.log('[seed] projecting the global leaderboard into Redis');
    const redis = new Redis(env.REDIS_URL);
    try {
      const rows = await db.select({ id: users.id, aura: users.aura }).from(users);
      const pipeline = redis.pipeline();
      pipeline.del('lb:global');
      for (const row of rows) {
        pipeline.zadd('lb:global', row.aura, row.id);
      }
      await pipeline.exec();
    } finally {
      redis.disconnect();
    }

    console.log(
      `[seed] done: ${created.length} users, ${createdPosts.length} posts, ${likeTotal} likes`,
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error('[seed] failed', error);
  process.exit(1);
});
