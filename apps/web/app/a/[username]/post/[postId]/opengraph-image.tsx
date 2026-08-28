import { type AppLocale, routing } from "@/i18n/routing";
import { staticTranslator } from "@/i18n/static";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api/errors";
import {
  OG_IMAGE_CONTENT_TYPE,
  OG_IMAGE_SIZE,
  renderOgImage,
} from "@/lib/og-image";
import { normalizeHandle } from "@/lib/share";

export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const revalidate = 10;

type Params = { params: Promise<{ username: string; postId: string }> };

export async function generateImageMetadata({ params }: Params) {
  const { username } = await params;
  const t = staticTranslator(routing.defaultLocale);

  return [
    {
      id: "share",
      alt: t("meta.post.alt", { username: normalizeHandle(username) }),
      size,
      contentType,
    },
  ];
}

export default async function PublicPostOgImage({ params }: Params) {
  const { username, postId } = await params;
  const locale: AppLocale = routing.defaultLocale;
  const t = staticTranslator(locale);
  const handle = normalizeHandle(username);

  try {
    const post = await api.getPost(postId);
    return renderOgImage({
      locale,
      eyebrow: `@${post.author.username}`,
      title: post.caption?.trim() || t("meta.post.socialTitle", { username: post.author.username }),
      subtitle: t("meta.og.subtitle"),
      aura: post.aura,
    });
  } catch (error) {
    if (!(error instanceof ApiError && error.isNotFound)) {
      throw error;
    }
  }

  return renderOgImage({
    locale,
    eyebrow: `@${handle}`,
    title: t("meta.post.socialTitle", { username: handle }),
    subtitle: t("meta.og.subtitle"),
  });
}
