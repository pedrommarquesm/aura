import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type {
  CastVoteResult,
  CursorPage,
  FeedCard,
  PostDetail,
  PublicProfile,
  SetReceiptResult,
  VoteReceipt,
} from '@/lib/api/types';
import { isInfiniteCardQuery, queryKeys } from '@/lib/query/keys';

type InfiniteCards = InfiniteData<CursorPage<FeedCard>, string | null>;

function patchCard(card: FeedCard, result: CastVoteResult): FeedCard {
  if (card.votedByMe && card.myAmount === result.amount && card.voteCount === result.voteCount) {
    return card;
  }

  return {
    ...card,
    votedByMe: true,
    myAmount: result.amount,
    voteCount: result.voteCount,
    aura: result.postAura,
    author: { ...card.author, aura: result.creatorAura },
  };
}

function mapInfinite(
  current: InfiniteCards | undefined,
  postId: string,
  result: CastVoteResult,
): InfiniteCards | undefined {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => (item.id === postId ? patchCard(item, result) : item)),
    })),
  };
}

/**
 * Writes a cast vote into every list that already shows this post, plus the
 * permalink. The home feed was not enough — opening a post from a profile
 * reads `['post', id]` and the grid reads `['user', id, 'posts']`.
 *
 * There is no unvote, so unlike the old like this only ever locks a vote in —
 * it never needs to roll a card back to an unvoted state.
 */
export function applyVoteResult(queryClient: QueryClient, postId: string, result: CastVoteResult) {
  queryClient.setQueriesData<InfiniteCards>(
    { predicate: (query) => isInfiniteCardQuery(query.queryKey) },
    (current) => mapInfinite(current, postId, result),
  );

  let authorUsername: string | undefined;
  queryClient.setQueryData<PostDetail>(queryKeys.post(postId), (current) => {
    if (!current) return current;
    authorUsername = current.author.username;
    return { ...patchCard(current, result), status: current.status };
  });

  if (!authorUsername) {
    const detail = queryClient.getQueryData<PostDetail>(queryKeys.post(postId));
    authorUsername = detail?.author.username;
  }

  if (authorUsername) {
    queryClient.setQueryData<PublicProfile>(queryKeys.user(authorUsername), (current) =>
      current ? { ...current, aura: result.creatorAura } : current,
    );
  }
}

type InfiniteVotes = InfiniteData<CursorPage<VoteReceipt>, string | null>;

/** Prepends a just-cast vote to the ledger's first page — it is newest-first (Q6). */
function prependVote(current: InfiniteVotes | undefined, row: VoteReceipt): InfiniteVotes {
  if (!current || current.pages.length === 0) {
    return {
      pageParams: [null],
      pages: [{ items: [row], nextCursor: null, hasMore: false }],
    };
  }

  const pages = [...current.pages];
  const first = pages[0]!;
  pages[0] = { ...first, items: [row, ...first.items] };
  return { ...current, pages };
}

/** Adds the vote just cast to the ledger cache so it appears without a refetch. */
export function applyVoteToLedger(queryClient: QueryClient, postId: string, row: VoteReceipt) {
  queryClient.setQueryData<InfiniteVotes>(queryKeys.postVotes(postId), (current) =>
    prependVote(current, row),
  );
}

/** Freezes the just-added receipt text onto the matching ledger row (Q3). */
export function applyReceiptResult(
  queryClient: QueryClient,
  postId: string,
  authorId: string,
  result: SetReceiptResult,
) {
  queryClient.setQueryData<InfiniteVotes>(queryKeys.postVotes(postId), (current) => {
    if (!current) return current;
    return {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        items: page.items.map((row) =>
          row.author.id === authorId && row.amount === result.amount
            ? { ...row, receipt: result.receipt }
            : row,
        ),
      })),
    };
  });
}
