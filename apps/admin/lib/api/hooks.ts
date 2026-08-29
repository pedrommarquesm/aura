"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { adminFetch } from "./client";
import type {
  ActionRow,
  AdminPostRow,
  AdminStats,
  AdminUserDetail,
  AdminUserRow,
  Page,
  PublicStaff,
  ReportRow,
  StaffRole,
  StaffStatus,
  UserStatus,
} from "./types";

function useAccessToken(): string | undefined {
  const { data } = useSession();
  return data?.accessToken;
}

export function useStats() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ["admin", "stats"],
    enabled: Boolean(accessToken),
    queryFn: () => adminFetch<AdminStats>("/v1/admin/stats", { accessToken: accessToken! }),
  });
}

export function useUsers(query: { q?: string; status?: UserStatus; offset: number; limit: number }) {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ["admin", "users", query],
    enabled: Boolean(accessToken),
    queryFn: () =>
      adminFetch<Page<AdminUserRow>>("/v1/admin/users", {
        accessToken: accessToken!,
        query,
      }),
  });
}

export function useUser(userId: string) {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ["admin", "users", userId],
    enabled: Boolean(accessToken && userId),
    queryFn: () =>
      adminFetch<AdminUserDetail>(`/v1/admin/users/${userId}`, { accessToken: accessToken! }),
  });
}

export function useUserPosts(userId: string, query: { offset: number; limit: number }) {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ["admin", "users", userId, "posts", query],
    enabled: Boolean(accessToken && userId),
    queryFn: () =>
      adminFetch<Page<AdminPostRow>>(`/v1/admin/users/${userId}/posts`, {
        accessToken: accessToken!,
        query,
      }),
  });
}

export function usePosts(query: {
  q?: string;
  status?: AdminPostRow["status"];
  offset: number;
  limit: number;
}) {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ["admin", "posts", query],
    enabled: Boolean(accessToken),
    queryFn: () =>
      adminFetch<Page<AdminPostRow>>("/v1/admin/posts", {
        accessToken: accessToken!,
        query,
      }),
  });
}

export function useReports(query: {
  status?: ReportRow["status"];
  offset: number;
  limit: number;
}) {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ["moderation", "reports", query],
    enabled: Boolean(accessToken),
    queryFn: () =>
      adminFetch<Page<ReportRow>>("/v1/moderation/reports", {
        accessToken: accessToken!,
        query,
      }),
  });
}

export function useModerationActions(query: { offset: number; limit: number }) {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ["moderation", "actions", query],
    enabled: Boolean(accessToken),
    queryFn: () =>
      adminFetch<Page<ActionRow>>("/v1/moderation/actions", {
        accessToken: accessToken!,
        query,
      }),
  });
}

export function useStaffList() {
  const accessToken = useAccessToken();
  return useQuery({
    queryKey: ["staff"],
    enabled: Boolean(accessToken),
    queryFn: () =>
      adminFetch<{ items: PublicStaff[] }>("/v1/staff", { accessToken: accessToken! }),
  });
}

export function useSetUserStatus() {
  const accessToken = useAccessToken();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: { userId: string; status: UserStatus; reason?: string }) =>
      adminFetch(`/v1/moderation/users/${input.userId}/status`, {
        accessToken: accessToken!,
        method: "POST",
        body: { status: input.status, reason: input.reason },
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin"] });
      await client.invalidateQueries({ queryKey: ["moderation"] });
    },
  });
}

export function useRemovePost() {
  const accessToken = useAccessToken();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: { postId: string; reason?: string }) =>
      adminFetch(`/v1/moderation/posts/${input.postId}/remove`, {
        accessToken: accessToken!,
        method: "POST",
        body: { reason: input.reason },
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin"] });
      await client.invalidateQueries({ queryKey: ["moderation"] });
    },
  });
}

export function useResolveReport() {
  const accessToken = useAccessToken();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: { reportId: string; decision: "dismiss" | "action"; reason?: string }) =>
      adminFetch(`/v1/moderation/reports/${input.reportId}/${input.decision}`, {
        accessToken: accessToken!,
        method: "POST",
        body: { reason: input.reason },
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["moderation"] });
      await client.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useInviteStaff() {
  const accessToken = useAccessToken();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: { email: string; role: Exclude<StaffRole, "owner">; displayName?: string }) =>
      adminFetch<{ staff: PublicStaff }>("/v1/staff", {
        accessToken: accessToken!,
        method: "POST",
        body: input,
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useUpdateStaff() {
  const accessToken = useAccessToken();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      staffId: string;
      role?: Exclude<StaffRole, "owner">;
      status?: StaffStatus;
      displayName?: string | null;
    }) =>
      adminFetch<{ staff: PublicStaff }>(`/v1/staff/${input.staffId}`, {
        accessToken: accessToken!,
        method: "PATCH",
        body: {
          role: input.role,
          status: input.status,
          displayName: input.displayName,
        },
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}
