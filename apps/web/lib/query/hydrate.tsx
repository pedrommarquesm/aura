import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { ReactNode } from "react";

import type { QueryClient } from "@tanstack/react-query";

/** Server-built cache → client QueryClient. One per request. */
export function Hydrate({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  return (
    <HydrationBoundary state={dehydrate(client)}>{children}</HydrationBoundary>
  );
}
