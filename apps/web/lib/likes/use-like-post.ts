"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useSession } from "@/components/auth/session-context";
import { ApiError } from "@/lib/api/errors";
import { apiErrorMessage } from "@/lib/api/error-message";
import type { Post } from "@/lib/api/types";
import { authContinueHref } from "@/lib/auth/return-to";
import { likePost, unlikePost } from "@/lib/likes/client";
import {
  applyLikeResult,
  applyOptimisticLike,
} from "@/lib/query/feed-cache";
import { queryKeys } from "@/lib/query/keys";

export function useLikePost({
  postId,
  likeCount,
  initiallyLiked,
  aura = 0,
  authorAura = 0,
}: {
  postId: string;
  likeCount: number;
  initiallyLiked: boolean;
  aura?: number;
  authorAura?: number;
}) {
  const locale = useLocale();
  const errors = useTranslations("errors");
  const { status, needsUsername } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [burst, setBurst] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const goToAuth = (kind: "login" | "username") => {
    const next = `${window.location.pathname}${window.location.search}`;
    router.push(authContinueHref(locale, kind, next, postId));
  };

  const requireAuth = () => {
    if (status !== "signedIn" || needsUsername) {
      goToAuth(status === "signedIn" ? "username" : "login");
      return true;
    }
    return false;
  };

  const mutation = useMutation({
    mutationFn: (nextLiked: boolean) =>
      nextLiked ? likePost(postId) : unlikePost(postId),
    onMutate: async (nextLiked) => {
      setError(null);
      if (nextLiked) setBurst((count) => count + 1);
      await queryClient.cancelQueries({ queryKey: queryKeys.feed.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.post(postId) });
      const snapshot = {
        feeds: queryClient.getQueriesData({ queryKey: queryKeys.feed.all }),
        post: queryClient.getQueryData<Post>(queryKeys.post(postId)),
      };
      applyOptimisticLike(queryClient, postId, nextLiked, {
        likedByMe: initiallyLiked,
        likeCount,
        aura,
        authorAura,
      });
      return snapshot;
    },
    onSuccess: (result) => {
      applyLikeResult(queryClient, postId, result);
    },
    onError: (cause, _nextLiked, snapshot) => {
      if (snapshot) {
        for (const [key, data] of snapshot.feeds) {
          queryClient.setQueryData(key, data);
        }
        queryClient.setQueryData(queryKeys.post(postId), snapshot.post);
      }
      setError(
        cause instanceof ApiError
          ? apiErrorMessage(errors, cause.code)
          : errors("unknown"),
      );
    },
  });

  const toggle = () => {
    if (requireAuth()) return;
    mutation.mutate(!initiallyLiked);
  };

  /** Double-tap / double-click: like only. Already liked just replays the burst. */
  const likeOnly = () => {
    setBurst((count) => count + 1);
    if (status !== "signedIn" || needsUsername) {
      // Let the heart burst paint before we leave the page.
      window.setTimeout(
        () => goToAuth(status === "signedIn" ? "username" : "login"),
        280,
      );
      return;
    }
    if (initiallyLiked) return;
    mutation.mutate(true);
  };

  return { toggle, likeOnly, burst, error };
}
