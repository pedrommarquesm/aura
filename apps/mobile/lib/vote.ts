/**
 * Shared vote/receipt constants for the client. Mirrors the server's locked
 * values in `apps/api/src/db/schema/votes.ts` and `apps/api/src/aura/vote-amount.ts`
 * (docs/redesign-tracker.md Q1, Q5, Q7). The server is authoritative — these
 * exist so the UI can enforce the same limits before ever making a request.
 */
export const MAX_VOTE_AURA = 100;
export const RECEIPT_MAX_LENGTH = 80;
