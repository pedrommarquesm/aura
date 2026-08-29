import { getTranslations } from "next-intl/server";

import { LikeButton } from "@/components/feed/like-button";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Container, Eyebrow } from "@/components/landing/section";
import { PostMedia } from "@/components/post-media";
import { AuraValue, Avatar, ButtonLink, buttonClassName } from "@/components/ui";
import type { Post } from "@/lib/api";
import { publicPostDeepLink } from "@/lib/share";
import { siteConfig } from "@/lib/site";

export function PublicPostUnavailable({ message }: { message: string }) {
  return (
    <>
      <SiteHeader />
      <main>
        <Container className="py-20">
          <p className="text-body text-text-secondary">{message}</p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

export async function PublicPost({ post }: { post: Post }) {
  const t = await getTranslations("post.page");
  const actions = await getTranslations("common.actions");
  const deepLink = publicPostDeepLink(post.author.username, post.id);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-border/70 py-10 sm:py-14">
          <Container className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
            <article className="overflow-hidden rounded-xl border border-border bg-surface">
              <PostMedia
                media={post.media}
                alt={post.caption ?? `@${post.author.username}`}
                priority
                sizes="(min-width: 1024px) 560px, 90vw"
                className="aspect-4/5"
              />
            </article>

            <div className="flex flex-col gap-6">
              <Eyebrow>{t("eyebrow")}</Eyebrow>

              <div className="flex items-center gap-3">
                <Avatar
                  username={post.author.username}
                  src={post.author.avatarUrl}
                  size="lg"
                />
                <div className="min-w-0">
                  <h1 className="truncate text-heading">@{post.author.username}</h1>
                  {post.author.title ? (
                    <p className="text-caption text-aura-bright">{post.author.title}</p>
                  ) : null}
                  <AuraValue value={post.author.aura} size="sm" tone="secondary" />
                </div>
              </div>

              {post.caption ? (
                <p className="text-body text-text-secondary">{post.caption}</p>
              ) : null}

              <div className="flex items-center justify-between border-t border-border/70 pt-4">
                <LikeButton
                  postId={post.id}
                  likeCount={post.likeCount}
                  initiallyLiked={post.likedByMe}
                />
                <AuraValue value={post.aura} size="lg" tone="aura" />
              </div>

              <div className="rounded-xl border border-aura/40 bg-surface p-6 shadow-aura-glow-sm">
                <h2 className="text-heading">{t("installTitle")}</h2>
                <p className="mt-2 text-body text-text-secondary">{t("installBody")}</p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <a href={deepLink} className={buttonClassName({ size: "lg" })}>
                    {t("openInApp")}
                  </a>
                  <ButtonLink href={siteConfig.appStoreUrl} size="lg" variant="secondary">
                    {actions("downloadIphone")}
                  </ButtonLink>
                  <ButtonLink
                    href={siteConfig.playStoreUrl}
                    size="lg"
                    variant="secondary"
                  >
                    {actions("downloadAndroid")}
                  </ButtonLink>
                </div>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
