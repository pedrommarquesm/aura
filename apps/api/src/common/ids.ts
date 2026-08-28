import { v7 as uuidv7 } from 'uuid';

/**
 * Time-sortable identifier for every row we create.
 *
 * UUIDv7 embeds a millisecond timestamp in its high bits, which gives us
 * ordered primary keys (better index locality than v4) and lets feed cursors
 * use the id as a stable tiebreaker on equal timestamps.
 *
 * Generated in the application rather than by the database on purpose:
 * Postgres only gained a native `uuidv7()` in 18, and we want identical
 * behaviour against a developer's local Postgres and whatever the platform
 * happens to run.
 */
export function newId(): string {
  return uuidv7();
}
