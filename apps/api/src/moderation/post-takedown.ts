/**
 * How a post takedown reverses Aura.
 *
 * The ledger is the only writer of `users.aura` / `posts.aura`. A removal
 * therefore writes a `REVERSAL` for the post's remaining balance rather than
 * decrementing the counters itself. See docs/backend-architecture.md §7 and
 * docs/redesign-tracker.md `RDX-17`.
 *
 * Aura Debt means the balance can be negative (a "Cooked" post). A removal
 * must zero out either direction — a positive balance is reversed down to
 * zero, and a negative one is reversed *up* to zero — so a removed post
 * always contributes exactly 0 net Aura. Negating the balance does both:
 * `-30` reverses `+30`, and `-(-30)` reverses `-30` back to zero.
 *
 * One event covers the net (every vote so far). A second pass exists only to
 * catch a vote that raced the status flip.
 */
export function takedownReversalAmount(postAura: number): number | null {
  if (!Number.isInteger(postAura)) {
    throw new Error(`Post Aura must be an integer, received ${postAura}`);
  }

  if (postAura === 0) return null;

  return -postAura;
}

export function takedownIdempotencyKey(postId: string, pass = 0): string {
  return pass === 0 ? `takedown:${postId}` : `takedown:${postId}:${pass}`;
}
