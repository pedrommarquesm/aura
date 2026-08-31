"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useSession } from "@/components/auth/session-context";
import { ApiError } from "@/lib/api/errors";
import { apiErrorMessage } from "@/lib/api/error-message";
import type { Post } from "@/lib/api/types";
import { getPathname } from "@/i18n/navigation";
import { sectionHash } from "@/i18n/sections";
import type { AppLocale } from "@/i18n/routing";
import { authContinueHref } from "@/lib/auth/return-to";
import { webAuthEnabled } from "@/lib/launch";
import { likePost, unlikePost } from "@/lib/likes/client";
import {
  applyLikeResult,
  applyOptimisticLike,
} from "@/lib/query/feed-cache";
import { queryKeys } from "@/lib/query/keys";

export type LikeSnapshot = {
  likedByMe: boolean;
  likeCount: number;
  aura: number;
  authorAura: number;
};

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
  // Local so a double-click fills this card's heart even if the list is slow
  // to re-render from the shared feed cache. Reset during render when the
  // parent props catch up — not in an effect.
  const propsKey = `${initiallyLiked}:${likeCount}:${aura}:${authorAura}`;
  const [seenProps, setSeenProps] = useState(propsKey);
  const [optimistic, setOptimistic] = useState<LikeSnapshot | null>(null);
  if (seenProps !== propsKey) {
    setSeenProps(propsKey);
    setOptimistic(null);
  }

  const liked = optimistic?.likedByMe ?? initiallyLiked;
  const count = optimistic?.likeCount ?? likeCount;
  const postAura = optimistic?.aura ?? aura;
  const creatorAura = optimistic?.authorAura ?? authorAura;

  const goToAuth = (kind: "login" | "username") => {
    if (!webAuthEnabled) {
      const home = getPathname({ href: "/", locale: locale as AppLocale });
      router.push(`${home}${sectionHash(locale as AppLocale, "join")}`);
      return;
    }
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
        optimistic,
      };
      const fallback: LikeSnapshot = {
        likedByMe: liked,
        likeCount: count,
        aura: postAura,
        authorAura: creatorAura,
      };
      const nextCount = Math.max(0, count + (nextLiked === liked ? 0 : nextLiked ? 1 : -1));
      const delta = nextCount - count;
      setOptimistic({
        likedByMe: nextLiked,
        likeCount: nextCount,
        aura: Math.max(0, postAura + delta * 10),
        authorAura: Math.max(0, creatorAura + delta * 10),
      });
      applyOptimisticLike(queryClient, postId, nextLiked, fallback);
      return snapshot;
    },
    onSuccess: (result) => {
      applyLikeResult(queryClient, postId, result);
    },
    onError: (cause, _nextLiked, snapshot) => {
      setOptimistic(snapshot?.optimistic ?? null);
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
    mutation.mutate(!liked);
  };

  /** Double-tap / double-click: like only. Already liked just replays the burst. */
  const likeOnly = () => {
    if (status !== "signedIn" || needsUsername) {
      setBurst((n) => n + 1);
      // Let the brief overlay wave play before we leave (matches --motion-burst).
      window.setTimeout(
        () => goToAuth(status === "signedIn" ? "username" : "login"),
        560,
      );
      return;
    }
    if (liked) {
      setBurst((n) => n + 1);
      return;
    }
    mutation.mutate(true);
  };

  return {
    toggle,
    likeOnly,
    burst,
    error,
    liked,
    likeCount: count,
    aura: postAura,
    authorAura: creatorAura,
  };
}
