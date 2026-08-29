"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { PublicUser } from "@/lib/api/types";

type MeResponse =
  | { user: PublicUser; needsUsername: boolean }
  | { error: { code: string } };

export type SessionStatus = "loading" | "signedOut" | "signedIn";

export type SessionValue = {
  status: SessionStatus;
  user: PublicUser | null;
  needsUsername: boolean;
  refresh: () => Promise<void>;
  clear: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

async function loadMe(): Promise<
  { user: PublicUser; needsUsername: boolean } | null
> {
  const response = await fetch("/api/auth/me");
  if (!response.ok) return null;
  const payload = (await response.json()) as MeResponse;
  if (payload && "user" in payload) return payload;
  return null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [status, setStatus] = useState<SessionStatus>("loading");

  const apply = useCallback(
    (payload: { user: PublicUser; needsUsername: boolean } | null) => {
      if (payload) {
        setUser(payload.user);
        setNeedsUsername(payload.needsUsername);
        setStatus("signedIn");
      } else {
        setUser(null);
        setNeedsUsername(false);
        setStatus("signedOut");
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    void loadMe()
      .then((payload) => {
        if (!cancelled) apply(payload);
      })
      .catch(() => {
        if (!cancelled) apply(null);
      });

    return () => {
      cancelled = true;
    };
  }, [apply]);

  const refresh = useCallback(async () => {
    try {
      apply(await loadMe());
    } catch {
      apply(null);
    }
  }, [apply]);

  const clear = useCallback(() => {
    setUser(null);
    setNeedsUsername(false);
    setStatus("signedOut");
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ status, user, needsUsername, refresh, clear }),
    [clear, needsUsername, refresh, status, user],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return value;
}
