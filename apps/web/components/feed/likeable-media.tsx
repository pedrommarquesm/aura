"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";

import { HeartIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useLikePost } from "@/lib/likes/use-like-post";

const DOUBLE_MS = 280;

export function LikeableMedia({
  postId,
  liked,
  likeCount,
  aura,
  authorAura,
  href,
  className,
  children,
}: {
  postId: string;
  liked: boolean;
  likeCount: number;
  aura: number;
  authorAura: number;
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  const t = useTranslations("feed.post");
  const router = useRouter();
  const { likeOnly, burst } = useLikePost({
    postId,
    likeCount,
    initiallyLiked: liked,
    aura,
    authorAura,
  });

  const lastClick = useRef(0);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    },
    [],
  );

  const onClick = (event: MouseEvent<HTMLElement>) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    if (now - lastClick.current < DOUBLE_MS) {
      lastClick.current = 0;
      if (timer.current != null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      likeOnly();
      return;
    }

    lastClick.current = now;
    if (!href) return;

    timer.current = window.setTimeout(() => {
      timer.current = null;
      router.push(href);
    }, DOUBLE_MS);
  };

  const overlay =
    burst > 0 ? (
      <span
        key={burst}
        className="pointer-events-none absolute inset-0 grid place-items-center"
      >
        <HeartIcon className="size-20 text-like animate-like-burst drop-shadow-[0_8px_24px_var(--color-like)]" />
      </span>
    ) : null;

  const shared = {
    onClick,
    onDoubleClick: (event: MouseEvent) => event.preventDefault(),
    title: t("a11y.doubleClick"),
    className: cn("relative block", className),
  };

  if (href) {
    return (
      <a href={href} {...shared}>
        {children}
        {overlay}
      </a>
    );
  }

  return (
    <div {...shared}>
      {children}
      {overlay}
    </div>
  );
}
