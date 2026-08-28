/**
 * Queue names shared by the API (which enqueues) and the worker (which
 * consumes). Kept in one file so the two processes cannot drift.
 */
export const QueueName = {
  /** Image and video processing for uploaded media. Consumed in MEDIA-04. */
  MEDIA: 'media',
  /** Recomputes `posts.trending_score`, never on a feed read. */
  TRENDING: 'trending',
} as const;

export type QueueNameValue = (typeof QueueName)[keyof typeof QueueName];

export const TrendingJob = {
  RECOMPUTE: 'recompute',
} as const;

export const MediaJob = {
  PROCESS: 'process',
} as const;

export interface MediaProcessPayload {
  postId: string;
  mediaAssetId: string;
}
