import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import Redis from 'ioredis';
import postgres from 'postgres';

import { newId } from '../common/ids';
import { loadEnv } from '../config/env';

import * as schema from './schema';
import { hashPassword, normalizeEmail } from '../auth/password';

import { auraEvents, authIdentities, mediaAssets, posts, users, votes } from './schema';

/**
 * Development seed.
 *
 * Gives the mobile and web clients something real to render while the upload
 * pipeline is still being built: published posts with media variants, votes
 * (some with receipts, some without, a couple negative), and a matching
 * ledger so Aura totals reconcile instead of being invented.
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

const POSITIVE_RECEIPTS = [
  'clean recovery',
  'unbothered fr',
  'this one is certified',
  'the aura is real',
  null,
  null,
];

const NEGATIVE_RECEIPTS = ['forced pose', 'tried way too hard', 'cooked ngl', null];

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
    await db.delete(votes);
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

    if (env.E2E_TEST_PASSWORD) {
      const email = normalizeEmail(env.E2E_TEST_EMAIL);
      const [e2e] = await db
        .insert(users)
        .values({
          id: newId(),
          username: 'e2e',
          displayName: 'E2E',
          locale: 'en',
          aura: 0,
        })
        .returning();

      await db.insert(authIdentities).values({
        id: newId(),
        userId: e2e!.id,
        provider: 'password',
        providerSub: email,
        emailAtSignup: email,
        passwordHash: await hashPassword(env.E2E_TEST_PASSWORD),
      });

      created.push(e2e!);
      console.log(`[seed] password login: ${email} / username e2e`);
    }

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

    console.log('[seed] creating votes, receipts, and matching ledger events');
    let voteTotal = 0;

    for (const [postIndex, post] of createdPosts.entries()) {
      // Newer posts get more votes, so trending has something to rank. Every
      // fourth post skews negative (Aura Debt / "Cooked") so the feed shows
      // both directions of the economy, not just a climb.
      const isCooked = postIndex % 4 === 3;
      const voterCount = Math.max(0, 12 - Math.floor(postIndex / 2));
      const voters = created.filter((user) => user.id !== post.authorId).slice(0, voterCount);

      let postAura = 0;

      for (const [voterIndex, voter] of voters.entries()) {
        const amount = isCooked
          ? -(20 + (voterIndex % 5) * 15) // -20..-80
          : 10 + (voterIndex % 5) * 18; // 10..82
        const receiptPool = amount > 0 ? POSITIVE_RECEIPTS : NEGATIVE_RECEIPTS;
        const receipt = receiptPool[voterIndex % receiptPool.length] ?? null;

        const eventId = newId();
        const createdAt = new Date(Date.now() - postIndex * 60_000 - voterIndex * 1_000);

        await db.insert(auraEvents).values({
          id: eventId,
          userId: post.authorId,
          sourceUserId: voter.id,
          postId: post.id,
          type: 'VOTE',
          amount,
          idempotencyKey: `vote:${voter.id}:${post.id}`,
          createdAt,
        });

        await db.insert(votes).values({
          userId: voter.id,
          postId: post.id,
          amount,
          receipt,
          auraEventId: eventId,
          createdAt,
        });

        postAura += amount;
        voteTotal += 1;
      }

      await db
        .update(posts)
        .set({
          voteCount: voters.length,
          aura: postAura,
          // Stand-in until the worker's first recompute; keeps /feed/trending ordered.
          trendingScore: postAura,
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
      `[seed] done: ${created.length} users, ${createdPosts.length} posts, ${voteTotal} votes`,
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error('[seed] failed', error);
  process.exit(1);
});
