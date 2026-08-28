import Image from "next/image";
import { useTranslations } from "next-intl";

import { PlayIcon } from "@/components/icons";
import type { PostMedia as PostMediaShape } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";

type PostMediaProps = {
  media: PostMediaShape;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

export function PostMedia({
  media,
  alt,
  sizes,
  priority = false,
  className,
}: PostMediaProps) {
  const t = useTranslations("feed.post");
  // Mock posters are vectors; the optimizer refuses SVG by design.
  const isVector = media.feedUrl.endsWith(".svg");

  return (
    <div className={cn("relative overflow-hidden bg-surface-elevated", className)}>
      <Image
        src={media.feedUrl}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={isVector}
        className="object-cover"
      />
      {media.type === "video" ? (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-bg/70 px-2.5 py-1 text-caption backdrop-blur-sm">
          <PlayIcon className="size-3" />
          {media.durationMs === undefined
            ? t("video")
            : formatDuration(media.durationMs)}
        </span>
      ) : null}
    </div>
  );
}
