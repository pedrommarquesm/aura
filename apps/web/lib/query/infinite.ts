import type { InfiniteData } from "@tanstack/react-query";

import type { CursorPage } from "@/lib/api/types";

export type FeedInfinite<T> = InfiniteData<CursorPage<T>, string | null>;

export function toInfinite<T>(page: CursorPage<T>): FeedInfinite<T> {
  return {
    pages: [page],
    pageParams: [null],
  };
}
