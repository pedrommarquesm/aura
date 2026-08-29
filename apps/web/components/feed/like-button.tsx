"use client";

import { useLocale, useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useSession } from "@/components/auth/session-context";
import { HeartIcon } from "@/components/icons";
import { ApiError } from "@/lib/api/errors";
import { apiErrorMessage } from "@/lib/api/error-message";
import { authContinueHref } from "@/lib/auth/return-to";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";
import { likePost, unlikePost } from "@/lib/likes/client";

const AURA_PER_LIKE = 10;

export function LikeButton({
  postId,
  likeCount,
  initiallyLiked,
}: {
  postId: string;
  likeCount: number;
  initiallyLiked: boolean;
}) {
  const locale = useLocale();
  const format = useFormatter();
  const t = useTranslations("feed.post");
  const errors = useTranslations("errors");
  const { status, needsUsername } = useSession();
  const router = useRouter();

  const [liked, setLiked] = useState(initiallyLiked);
  const [burst, setBurst] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const displayCount = likeCount + (liked === initiallyLiked ? 0 : liked ? 1 : -1);

  const goToAuth = (kind: "login" | "username") => {
    const next = `${window.location.pathname}${window.location.search}`;
    router.push(authContinueHref(locale, kind, next, postId));
  };

  const toggle = () => {
    if (status !== "signedIn" || needsUsername) {
      goToAuth(status === "signedIn" ? "username" : "login");
      return;
    }

    const next = !liked;
    setLiked(next);
    setError(null);
    if (next) setBurst((count) => count + 1);

    void Promise.resolve(next ? likePost(postId) : unlikePost(postId)).catch(
      (cause) => {
        setLiked(!next);
        setError(
          cause instanceof ApiError
            ? apiErrorMessage(errors, cause.code)
            : errors("unknown"),
        );
      },
    );
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={liked}
        aria-label={t("likes", { count: displayCount })}
        title={liked ? t("a11y.unlike") : t("a11y.like")}
        className={cn(
          "relative inline-flex items-center gap-1.5 rounded-full text-label",
          "transition-colors duration-(--motion-quick) ease-out",
          "hover:text-like focus-visible:outline-none",
          liked ? "text-like" : "text-text-secondary",
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
          filled={liked}
          className={cn("size-4", liked && burst > 0 && "animate-like-pop")}
        />
        <span aria-hidden className="aura-numerals text-label">
          {formatCount(format, displayCount)}
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
