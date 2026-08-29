"use client";

import {
  HydrationBoundary,
  type DehydratedState,
} from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * Keep the first dehydrated snapshot. A later RSC refresh (Next revalidates
 * the page after some fetches) would otherwise write the first feed page
 * over an infinite query and jump the scroll to the top.
 */
export function Hydrate({
  state,
  children,
}: {
  state: DehydratedState;
  children: ReactNode;
}) {
  const [frozen] = useState(state);
  return <HydrationBoundary state={frozen}>{children}</HydrationBoundary>;
}
