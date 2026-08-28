/**
 * How a post takedown reverses Aura.
 *
 * The ledger is the only writer of `users.aura` / `posts.aura`. A removal
 * therefore writes a `REVERSAL` for the post's remaining balance rather than
 * decrementing the counters itself. See docs/backend-architecture.md §7 and §14.
 *
 * One event covers the net (likes minus unlikes already reversed). A second
 * pass exists only to catch a like that raced the status flip.
 */
export function takedownReversalAmount(postAura: number): number | null {
  if (!Number.isInteger(postAura)) {
    throw new Error(`Post Aura must be an integer, received ${postAura}`);
  }

  if (postAura <= 0) return null;

  return -postAura;
}

export function takedownIdempotencyKey(postId: string, pass = 0): string {
  return pass === 0 ? `takedown:${postId}` : `takedown:${postId}:${pass}`;
}
