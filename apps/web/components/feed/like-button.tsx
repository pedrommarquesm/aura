"use client";

import { useFormatter, useTranslations } from "next-intl";

import { HeartIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";

const AURA_PER_LIKE = 10;

export function LikeButton({
  liked,
  likeCount,
  burst,
  error,
  onToggle,
}: {
  liked: boolean;
  likeCount: number;
  burst: number;
  error: string | null;
  onToggle: () => void;
}) {
  const format = useFormatter();
  const t = useTranslations("feed.post");

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={liked}
        aria-label={t("likes", { count: likeCount })}
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
