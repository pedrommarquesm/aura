"use client";

import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { useRef } from "react";

import { CommentIcon, MoreIcon, ShareIcon } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { auraTitle } from "@/lib/aura";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";

/**
 * Landing stand-in for mobile `FeedPostCard`: full-bleed media, top-right
 * Aura pill, right action stack (🗿 / comments / share / more), bottom
 * overlay with avatar, username, title, caption. Chrome is `bg/70`.
 */
export type DemoPost = {
  id: string;
  username: string;
  caption: string;
  image: string;
  aura: number;
  likes: number;
  comments: number;
};

export const DEMO_POSTS: DemoPost[] = [
  {
    id: "unbothered",
    username: "maya",
    caption: "left the group chat on read. unbothered.",
    image: "/demo/maya.jpg",
    aura: 1280,
    likes: 128,
    comments: 18,
  },
  {
    id: "fit",
    username: "kai",
    caption: "the fit spoke first. i just showed up.",
    image: "/demo/kai.jpg",
    aura: 860,
    likes: 86,
    comments: 9,
  },
  {
    id: "cold",
    username: "noura",
    caption:
      "coldest walk home of my life and i meant it. the air hit different and i did not look back once.",
    image: "/demo/noura.jpg",
    aura: 2140,
    likes: 214,
    comments: 31,
  },
];

const CHROME = "bg-[rgba(10,10,15,0.7)]";
const ACTION = "size-[3.25rem]";

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[336px]">
      <div
        aria-hidden
        className="absolute -inset-8 animate-aura-pulse rounded-full bg-aura/25 blur-3xl"
      />
      <div className="relative rounded-[2.25rem] border border-border bg-surface-elevated p-2.5 shadow-aura-glow">
        <div className="relative aspect-[9/17.5] overflow-hidden rounded-[1.85rem] bg-bg">
          {children}
        </div>
      </div>
    </div>
  );
}

export function DemoFeedPost({
  post,
  liked = false,
  burst = 0,
  burstOrigin,
  onLike,
}: {
  post: DemoPost;
  liked?: boolean;
  burst?: number;
  burstOrigin?: { x: number; y: number };
  onLike?: (origin: { x: number; y: number }) => void;
}) {
  const format = useFormatter();
  const t = useTranslations("landing.play");
  const stageRef = useRef<HTMLDivElement>(null);
  const likes = post.likes + (liked ? 1 : 0);
  const aura = post.aura + (liked ? 10 : 0);
  const title = auraTitle(aura);
  const showSeeMore = post.caption.length > 80;

  const likeAt = (clientX: number, clientY: number) => {
    if (!onLike) return;
    const box = stageRef.current?.getBoundingClientRect();
    onLike({
      x: box ? clientX - box.left : clientX,
      y: box ? clientY - box.top : clientY,
    });
  };

  return (
    <div ref={stageRef} className="absolute inset-0 bg-bg">
      {onLike ? (
        <button
          type="button"
          onDoubleClick={(event) => likeAt(event.clientX, event.clientY)}
          className="absolute inset-0 cursor-pointer"
          aria-label={t("doubleTap")}
        >
          <Image src={post.image} alt="" fill sizes="336px" className="object-cover" priority />
        </button>
      ) : (
        <div className="absolute inset-0">
          <Image src={post.image} alt="" fill sizes="336px" className="object-cover" priority />
        </div>
      )}

      {burst > 0 && burstOrigin ? (
        <span
          key={burst}
          aria-hidden
          className="pointer-events-none absolute text-6xl leading-none animate-like-burst"
          style={{
            left: burstOrigin.x,
            top: burstOrigin.y,
            marginLeft: "-1.5rem",
            marginTop: "-2.5rem",
            textShadow: "0 0 24px color-mix(in oklab, var(--color-aura) 70%, transparent)",
          }}
        >
          🗿
        </span>
      ) : null}

      <div
        className={cn(
          "pointer-events-none absolute top-4 right-4 rounded-full px-3 py-1.5",
          CHROME,
        )}
      >
        <p className="aura-numerals text-label font-extrabold tracking-aura text-aura-bright">
          {formatCount(format, aura)} 🗿
        </p>
      </div>

      <div className="pointer-events-none absolute right-3 bottom-4 flex flex-col items-center gap-3">
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => {
              const box = stageRef.current?.getBoundingClientRect();
              likeAt(
                (box?.left ?? 0) + (box?.width ?? 0) / 2,
                (box?.top ?? 0) + (box?.height ?? 0) / 2,
              );
            }}
            className={cn(
              "grid place-items-center rounded-full",
              ACTION,
              CHROME,
              onLike ? "pointer-events-auto" : "pointer-events-none",
            )}
            aria-label={t("doubleTap")}
            tabIndex={onLike ? 0 : -1}
          >
            <span className={cn("text-[1.75rem] leading-none", liked ? "opacity-100" : "opacity-70")}>
              🗿
            </span>
          </button>
          <span
            className={cn(
              "pt-1 text-caption font-semibold aura-numerals",
              liked ? "text-aura-bright" : "text-text-secondary",
            )}
          >
            {formatCount(format, likes)}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <span className={cn("grid place-items-center rounded-full", ACTION, CHROME)}>
            <CommentIcon className="size-6 text-text" />
          </span>
          <span className="pt-1 text-caption font-semibold aura-numerals text-text-secondary">
            {formatCount(format, post.comments)}
          </span>
        </div>

        <span className={cn("grid place-items-center rounded-full", ACTION, CHROME)}>
          <ShareIcon className="size-6 text-text" />
        </span>

        <span className={cn("grid place-items-center rounded-full", ACTION, CHROME)}>
          <MoreIcon className="size-6 text-text" />
        </span>
      </div>

      <div className={cn("absolute inset-x-0 bottom-0 rounded-t-2xl px-4 py-3 pr-[5.25rem]", CHROME)}>
        <div className="flex items-center gap-2 pb-2">
          <Avatar username={post.username} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-label font-semibold">@{post.username}</p>
            <p className="text-caption text-aura-bright">{title}</p>
          </div>
        </div>
        <p className="line-clamp-2 text-label text-text-secondary">{post.caption}</p>
        {showSeeMore ? (
          <p className="pt-1 text-caption text-aura-bright">{t("seeMore")}</p>
        ) : null}
      </div>
    </div>
  );
}
