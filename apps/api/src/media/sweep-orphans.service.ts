import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, lt } from 'drizzle-orm';

import { ENV, type Env } from '../config/env';
import { DB, type Database } from '../db/db.module';
import { mediaAssets, posts } from '../db/schema';

import { OBJECT_STORE, type ObjectStore } from './object-store';

export interface SweepResult {
  deleted: number;
}

/**
 * Deletes posts that never finished uploading.
 *
 * A client that dies after `POST /posts/uploads` leaves an `uploading` row and
 * possibly an object. After the TTL those are junk, not in-flight work.
 */
@Injectable()
export class SweepOrphansService {
  private readonly logger = new Logger(SweepOrphansService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    @Inject(OBJECT_STORE) private readonly store: ObjectStore,
  ) {}

  async sweep(): Promise<SweepResult> {
    const cutoff = new Date(Date.now() - this.env.MEDIA_ORPHAN_TTL_HOURS * 60 * 60 * 1000);

    const orphans = await this.db
      .select({
        postId: posts.id,
        storageKey: mediaAssets.storageKey,
      })
      .from(posts)
      .leftJoin(mediaAssets, eq(mediaAssets.postId, posts.id))
      .where(and(eq(posts.status, 'uploading'), lt(posts.createdAt, cutoff)));

    for (const orphan of orphans) {
      if (orphan.storageKey && this.store.configured) {
        try {
          await this.store.delete(orphan.storageKey);
        } catch (error) {
          this.logger.warn(`could not delete orphan object ${orphan.storageKey}: ${String(error)}`);
        }
      }

      await this.db.delete(posts).where(eq(posts.id, orphan.postId));
    }

    if (orphans.length > 0) {
      this.logger.log(`swept ${orphans.length} orphan upload(s)`);
    }

    return { deleted: orphans.length };
  }
}
