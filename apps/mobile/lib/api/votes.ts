import { api } from './client';
import type { CastVoteResult, CursorPage, SetReceiptResult, VoteReceipt } from './types';

/** Newest-first ledger page size (docs/redesign-tracker.md Q6). */
export const VOTE_LEDGER_PAGE_SIZE = 20;

/** One shot, -100..100, nonzero. No unvote — see `isValidVoteAmount` on the API. */
export function castVote(
  postId: string,
  amount: number,
  receipt?: string | null,
): Promise<CastVoteResult> {
  return api.post<CastVoteResult>(`/posts/${postId}/votes`, {
    amount,
    receipt: receipt || undefined,
  });
}

/** Fills a receipt left empty at release. Frozen after that (Q3). */
export function setVoteReceipt(postId: string, receipt: string): Promise<SetReceiptResult> {
  return api.patch<SetReceiptResult>(`/posts/${postId}/votes/receipt`, { receipt });
}

export function fetchVoteLedger(
  postId: string,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<CursorPage<VoteReceipt>> {
  return api.get<CursorPage<VoteReceipt>>(`/posts/${postId}/votes`, {
    query: { cursor, limit: VOTE_LEDGER_PAGE_SIZE },
    signal,
  });
}

/** The newest receipts with text — what floats in-feed (Q19). */
export function fetchVoteOverlay(postId: string, signal?: AbortSignal): Promise<VoteReceipt[]> {
  return api.get<VoteReceipt[]>(`/posts/${postId}/votes/overlay`, { signal });
}
