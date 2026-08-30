import type { PostMedia } from "@/lib/api";

/** Poster for a card. Mux videos have no `feedUrl` — HLS is the playable file. */
export function mediaPosterUrl(media: PostMedia): string | null {
  return media.posterUrl ?? media.thumbUrl ?? media.feedUrl ?? null;
}

/** Playable HLS (or nothing). Never the R2 master. */
export function mediaPlaybackUrl(media: PostMedia): string | null {
  if (media.type !== "video") return null;
  return media.hlsUrl ?? null;
}
