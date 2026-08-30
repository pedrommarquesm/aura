import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { PublicPost, PublicPostUnavailable } from "@/components/public-post";
import type { Post } from "@/lib/api/types";
import { dehydrate } from "@tanstack/react-query";

import { loadPostById } from "@/lib/query/actions";
import { makeQueryClient } from "@/lib/query/client";
import { Hydrate } from "@/lib/query/hydrate";
import { queryKeys } from "@/lib/query/keys";
import { buildShareMetadata } from "@/lib/seo";
import { mediaPosterUrl } from "@/lib/media/playback";
import { normalizeHandle, publicPostPath } from "@/lib/share";

/** Same window as the public feed cache (architecture §8.4). */
export const revalidate = 10;

type RouteParams = { username: string; postId: string };

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
    post = await loadPostById(postId);
  } catch {
    post = null;
  }

  if (!post) {
    return { title: t("title", { username: normalizeHandle(username) }) };
  }

  const handle = post.author.username;
  const caption = post.caption?.trim();
  const image = mediaPosterUrl(post.media) ?? undefined;

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
    post = await loadPostById(postId);
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

  const queryClient = makeQueryClient();
  queryClient.setQueryData(queryKeys.post(post.id), post);

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <PublicPost post={post} />
    </Hydrate>
  );
}
