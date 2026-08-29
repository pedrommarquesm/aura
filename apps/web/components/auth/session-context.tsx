"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import type { PublicUser } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";
import { fetchMe } from "@/lib/query/me";

export type SessionStatus = "loading" | "signedOut" | "signedIn";

export type SessionValue = {
  status: SessionStatus;
  user: PublicUser | null;
  needsUsername: boolean;
  refresh: () => Promise<void>;
  clear: () => void;
};

export function useSession(): SessionValue {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchMe,
    staleTime: 60_000,
    retry: false,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.me });
  }, [queryClient]);

  const clear = useCallback(() => {
    queryClient.setQueryData(queryKeys.me, null);
  }, [queryClient]);

  if (query.isPending) {
    return {
      status: "loading",
      user: null,
      needsUsername: false,
      refresh,
      clear,
    };
  }

  const snapshot = query.data ?? null;

  return {
    status: snapshot ? "signedIn" : "signedOut",
    user: snapshot?.user ?? null,
    needsUsername: snapshot?.needsUsername ?? false,
    refresh,
    clear,
  };
}
