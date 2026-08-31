"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { HeartIcon } from "@/components/icons";
import { Section } from "@/components/landing/section";
import { AuraValue, Avatar } from "@/components/ui";
import { sectionId } from "@/i18n/sections";
import { cn } from "@/lib/cn";

type DemoPost = {
  id: string;
  username: string;
  caption: string;
  aura: number;
  likes: number;
  mark: string;
};

const POSTS: DemoPost[] = [
  {
    id: "unbothered",
    username: "maya",
    caption: "left the group chat on read. unbothered.",
    aura: 1280,
    likes: 128,
    mark: "🗿",
  },
  {
    id: "fit",
    username: "kai",
    caption: "the fit spoke first. i just showed up.",
    aura: 860,
    likes: 86,
    mark: "✦",
  },
  {
    id: "cold",
    username: "noura",
    caption: "coldest walk home of my life and i meant it.",
    aura: 2140,
    likes: 214,
    mark: "◆",
  },
];

export function Play() {
  const locale = useLocale();
  const t = useTranslations("landing.play");
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [burst, setBurst] = useState(0);
  const [step, setStep] = useState<"look" | "like" | "climb">("look");

  const post = POSTS[index]!;
  const isLiked = Boolean(liked[post.id]);
  const likes = post.likes + (isLiked ? 1 : 0);
  const aura = post.aura + (isLiked ? 10 : 0);

  const award = () => {
    setBurst((count) => count + 1);
    if (!isLiked) {
      setLiked((current) => ({ ...current, [post.id]: true }));
      setStep("climb");
    }
  };

  return (
    <Section
      id={sectionId(locale, "play")}
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative mx-auto w-full max-w-[336px]">
          <div
            aria-hidden
            className="absolute -inset-8 animate-aura-pulse rounded-full bg-aura/25 blur-3xl"
          />
          <div className="relative rounded-[2.25rem] border border-border bg-surface-elevated p-2.5 shadow-aura-glow">
            <div className="overflow-hidden rounded-[1.85rem] bg-bg">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-label">{t("phoneTitle")}</span>
                <AuraValue value={aura} size="sm" tone="aura" />
              </div>

              <button
                type="button"
                onDoubleClick={award}
                className="relative block w-full cursor-pointer"
                aria-label={t("doubleTap")}
              >
                <div
                  className="relative aspect-4/5 overflow-hidden"
                  style={{
                    backgroundImage: `linear-gradient(160deg, ${
                      post.id === "unbothered"
                        ? "#3b1d6e, #8b5cf6, #111018"
                        : post.id === "fit"
                          ? "#1a1a2e, #16213e, #0f3460"
                          : "#2a0845, #6441a5, #0a0a0f"
                    })`,
                  }}
                >
                  <span className="absolute inset-0 grid place-items-center text-6xl opacity-80">
                    {post.mark}
                  </span>
                  {burst > 0 ? (
                    <span
                      key={burst}
                      className="pointer-events-none absolute top-1/2 left-1/2 text-5xl text-like animate-like-burst"
                    >
                      ❤
                    </span>
                  ) : null}
                  {burst > 0 ? (
                    <span
                      key={`rise-${burst}`}
                      className="pointer-events-none absolute bottom-8 left-1/2 text-label font-extrabold tracking-aura text-aura-bright animate-like-rise"
                    >
                      {t("auraGain", { amount: 10 })}
                    </span>
                  ) : null}
                </div>
              </button>

              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-2.5">
                  <Avatar username={post.username} size="sm" ring />
                  <span className="text-label">@{post.username}</span>
                </div>
                <p className="text-body text-text-secondary">{post.caption}</p>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={award}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-label",
                      isLiked ? "text-like" : "text-text-secondary",
                    )}
                  >
                    <HeartIcon
                      filled={isLiked}
                      className={cn("size-4", isLiked && burst > 0 && "animate-like-pop")}
                    />
                    <span className="aura-numerals">{likes}</span>
                  </button>
                  <AuraValue value={aura} size="sm" tone="secondary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <ol className="grid gap-4">
            {(
              [
                { id: "look" as const, title: t("steps.look.title"), body: t("steps.look.body") },
                { id: "like" as const, title: t("steps.like.title"), body: t("steps.like.body") },
                { id: "climb" as const, title: t("steps.climb.title"), body: t("steps.climb.body") },
              ] as const
            ).map((item, order) => (
              <li
                key={item.id}
                className={cn(
                  "rounded-lg border p-5 transition-colors duration-(--motion-quick) ease-out",
                  step === item.id
                    ? "border-aura/50 bg-surface-elevated shadow-aura-glow-sm"
                    : "border-border bg-surface",
                )}
              >
                <p className="aura-numerals text-caption text-aura-bright">
                  {String(order + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-heading">{item.title}</h3>
                <p className="mt-2 text-body text-text-secondary">{item.body}</p>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setIndex((current) => (current + 1) % POSTS.length);
                setStep("look");
              }}
              className="rounded-full border border-border bg-surface-elevated px-5 py-2.5 text-label hover:border-aura"
            >
              {t("nextPost")}
            </button>
            <p className="self-center text-caption text-text-muted">{t("hint")}</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
