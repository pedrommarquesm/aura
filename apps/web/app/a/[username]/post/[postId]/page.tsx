import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { PublicPost, PublicPostUnavailable } from "@/components/public-post";
import { api } from "@/lib/api";
import { apiGet } from "@/lib/api/client";
import { apiConfig } from "@/lib/api/config";
import { ApiError } from "@/lib/api/errors";
import type { Post } from "@/lib/api/types";
import { getSession } from "@/lib/auth/session";
import { buildShareMetadata } from "@/lib/seo";
import { normalizeHandle, publicPostPath } from "@/lib/share";

/** Same window as the public feed cache (architecture §8.4). */
export const revalidate = 10;

type RouteParams = { username: string; postId: string };

async function loadPost(postId: string): Promise<Post | null> {
  try {
    const session = await getSession();
    if (session && !apiConfig.useMock) {
      return await apiGet<Post>(`/v1/posts/${encodeURIComponent(postId)}`, {
        accessToken: session.accessToken,
      });
    }
    return await api.getPost(postId);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { username, postId } = await params;
  const locale = await getLocale();
  const t = await getTranslations("meta.post");

  let post: Post | null = null;
  try {
    post = await loadPost(postId);
  } catch {
    post = null;
  }

  if (!post) {
    return { title: t("title", { username: normalizeHandle(username) }) };
  }

  const handle = post.author.username;
  const caption = post.caption?.trim();
  const image = post.media.feedUrl ?? post.media.thumbUrl ?? undefined;

  return buildShareMetadata({
    locale,
    canonicalPath: publicPostPath(handle, post.id),
    title: t("title", { username: handle }),
    socialTitle: t("socialTitle", { username: handle }),
    description: caption
      ? t("description", { caption })
      : t("descriptionEmpty", { username: handle }),
    image,
  });
}

export default async function PublicPostPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { username, postId } = await params;
  let post: Post | null = null;
  let failed = false;

  try {
    post = await loadPost(postId);
  } catch {
    failed = true;
  }

  if (failed) {
    const t = await getTranslations("post.page");
    return (
      <PublicPostUnavailable message={t("unavailable")} />
    );
  }

  if (!post) notFound();

  const canonical = publicPostPath(post.author.username, post.id);
  if (normalizeHandle(username) !== normalizeHandle(post.author.username)) {
    permanentRedirect(canonical);
  }

  return <PublicPost post={post} />;
}
