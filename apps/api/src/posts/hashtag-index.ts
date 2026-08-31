import { eq } from 'drizzle-orm';

import type { Database } from '../db/db.module';
import { postHashtags } from '../db/schema';

import { extractHashtags } from './hashtags';

/** Replace the indexed tags for one post. Called on complete and caption edit. */
export async function replacePostHashtags(
  db: Database,
  postId: string,
  caption: string | null,
): Promise<void> {
  const tags = extractHashtags(caption);

  await db.delete(postHashtags).where(eq(postHashtags.postId, postId));

  if (tags.length === 0) return;

  await db.insert(postHashtags).values(tags.map((tag) => ({ postId, tag })));
}
