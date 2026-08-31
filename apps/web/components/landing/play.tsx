"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { DemoFeedPost, PhoneFrame } from "@/components/landing/demo-feed-post";
import { DEMO_POSTS } from "@/lib/demo-posts";
import { Section } from "@/components/landing/section";
import { sectionId } from "@/i18n/sections";
import { cn } from "@/lib/cn";

export function Play() {
  const locale = useLocale();
  const t = useTranslations("landing.play");
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [burst, setBurst] = useState(0);
  const [burstOrigin, setBurstOrigin] = useState({ x: 160, y: 240 });
  const [step, setStep] = useState<"look" | "like" | "climb">("look");

  const post = DEMO_POSTS[index]!;
  const isLiked = Boolean(liked[post.id]);

  const award = (origin: { x: number; y: number }) => {
    setBurstOrigin(origin);
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
      className="overflow-x-hidden"
    >
      <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <PhoneFrame>
          <DemoFeedPost
            post={post}
            liked={isLiked}
            burst={burst}
            burstOrigin={burstOrigin}
            onLike={award}
          />
        </PhoneFrame>

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
                setIndex((current) => (current + 1) % DEMO_POSTS.length);
                setBurst(0);
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
