"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

import { HeartIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useLikePost } from "@/lib/likes/use-like-post";

const DOUBLE_MS = 280;
const HEART = 64;

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
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    },
    [],
  );

  const pointInTarget = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

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
      setOrigin(pointInTarget(event));
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
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: origin.x,
          top: origin.y,
          width: HEART,
          height: HEART,
          marginLeft: -HEART / 2,
          marginTop: -HEART / 2,
        }}
      >
        <HeartIcon className="size-full text-like animate-like-burst drop-shadow-[0_8px_24px_var(--color-like)]" />
      </span>
    ) : null;

  const shared = {
    onClick,
    onDoubleClick: (event: MouseEvent) => event.preventDefault(),
    title: t("a11y.doubleClick"),
    className: cn("relative block overflow-hidden", className),
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
