"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useSession } from "@/components/auth/session-context";
import { HeartIcon } from "@/components/icons";
import { ApiError } from "@/lib/api/errors";
import { apiErrorMessage } from "@/lib/api/error-message";
import type { Post } from "@/lib/api/types";
import { authContinueHref } from "@/lib/auth/return-to";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";
import { likePost, unlikePost } from "@/lib/likes/client";
import {
  applyLikeResult,
  applyOptimisticLike,
} from "@/lib/query/feed-cache";
import { queryKeys } from "@/lib/query/keys";

const AURA_PER_LIKE = 10;

export function LikeButton({
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
  const format = useFormatter();
  const t = useTranslations("feed.post");
  const errors = useTranslations("errors");
  const { status, needsUsername } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [burst, setBurst] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

  const goToAuth = (kind: "login" | "username") => {
    const next = `${window.location.pathname}${window.location.search}`;
    router.push(authContinueHref(locale, kind, next, postId));
  };

  const toggle = () => {
    if (status !== "signedIn" || needsUsername) {
      goToAuth(status === "signedIn" ? "username" : "login");
      return;
    }
    mutation.mutate(!initiallyLiked);
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={initiallyLiked}
        aria-label={t("likes", { count: likeCount })}
        title={initiallyLiked ? t("a11y.unlike") : t("a11y.like")}
        className={cn(
          "relative inline-flex items-center gap-1.5 rounded-full text-label",
          "transition-colors duration-(--motion-quick) ease-out",
          "hover:text-like focus-visible:outline-none",
          initiallyLiked ? "text-like" : "text-text-secondary",
        )}
      >
        {burst > 0 ? (
          <span
            key={burst}
            className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 text-caption font-extrabold tracking-aura text-aura-bright animate-like-rise"
          >
            {t("auraGain", { amount: AURA_PER_LIKE })}
          </span>
        ) : null}

        <HeartIcon
          filled={initiallyLiked}
          className={cn(
            "size-4",
            initiallyLiked && burst > 0 && "animate-like-pop",
          )}
        />
        <span aria-hidden className="aura-numerals text-label">
          {formatCount(format, likeCount)}
        </span>
      </button>

      {error ? (
        <p className="text-caption text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
