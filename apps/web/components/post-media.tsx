"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { PlayIcon } from "@/components/icons";
import { PostVideo } from "@/components/post-video";
import type { PostMedia as PostMediaShape } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";
import { mediaPlaybackUrl, mediaPosterUrl } from "@/lib/media/playback";

type PostMediaProps = {
  media: PostMediaShape;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Landing mock — keep the poster, do not autoplay. */
  playInView?: boolean;
};

export function PostMedia({
  media,
  alt,
  sizes,
  priority = false,
  className,
  playInView = true,
}: PostMediaProps) {
  const t = useTranslations("feed.post");
  const [failed, setFailed] = useState(false);
  const poster = mediaPosterUrl(media);
  const playback = mediaPlaybackUrl(media);
  // Mock posters are vectors; the optimizer refuses SVG by design.
  const isVector = poster?.endsWith(".svg") ?? false;

  return (
    <div className={cn("relative overflow-hidden bg-surface-elevated", className)}>
      {playback && playInView ? (
        <PostVideo src={playback} poster={poster} alt={alt} />
      ) : poster && !failed ? (
        <Image
          src={poster}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={isVector}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
      {media.type === "video" ? (
        <span className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-bg/70 px-2.5 py-1 text-caption backdrop-blur-sm">
          <PlayIcon className="size-3" />
          {media.durationMs == null
            ? t("video")
            : formatDuration(media.durationMs)}
        </span>
      ) : null}
    </div>
  );
}
