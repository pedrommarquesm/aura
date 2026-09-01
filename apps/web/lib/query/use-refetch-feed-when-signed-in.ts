"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useSession } from "@/components/auth/session-context";
import { queryKeys, type FeedRanking } from "@/lib/query/keys";

/**
 * `[locale]` is statically generated (next-intl `generateStaticParams`), so the
 * dehydrated feed can be a guest snapshot — `votedByMe: false` for everyone.
 * The permalink lives outside that tree and loads the session per request.
 *
 * When we know the viewer, refetch `/api/feed` (cookie-aware BFF, not a Server
 * Action). The list stays mounted so the scroll does not jump (WEB-18).
 */
export function useRefetchFeedWhenSignedIn(ranking: FeedRanking) {
  const { status } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status !== "signedIn") return;
    void queryClient.refetchQueries({
      queryKey: queryKeys.feed.ranking(ranking),
    });
  }, [status, queryClient, ranking]);
}
