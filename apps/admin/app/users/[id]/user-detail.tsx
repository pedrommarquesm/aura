"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { EmptyState, QueryError } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRemovePost, useSetUserStatus, useUser, useUserPosts } from "@/lib/api/hooks";
import type { UserStatus } from "@/lib/api/types";
import { formatDate, formatNumber } from "@/lib/format";

export function UserDetail({ userId }: { userId: string }) {
  const user = useUser(userId);
  const posts = useUserPosts(userId, { offset: 0, limit: 25 });
  const setStatus = useSetUserStatus();
  const removePost = useRemovePost();
  const [reason, setReason] = useState("");

  if (user.error) return <QueryError message={user.error.message} />;
  if (!user.data) {
    return <Card className="h-48 animate-pulse bg-surface-elevated" />;
  }

  const row = user.data;

  async function changeStatus(status: UserStatus) {
    if (!confirm(`Set @${row.username} to ${status}?`)) return;
    await setStatus.mutateAsync({ userId, status, reason: reason || undefined });
  }

  return (
    <div className="space-y-8">
      <div>
        <ButtonLinkFallback />
        <h1 className="mt-4 text-title">@{row.username}</h1>
        <p className="mt-1 text-body text-text-secondary">
          {row.displayName ?? "No display name"} · {row.email ?? "no email on file"}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        <Stat label="Status" value={<StatusPill value={row.status} />} />
        <Stat label="Aura" value={formatNumber(row.aura)} numeric />
        <Stat label="Published posts" value={formatNumber(row.postCount)} numeric />
        <Stat label="Joined" value={formatDate(row.createdAt)} />
      </section>

      <Card className="p-5">
        <h2 className="text-heading">Moderation</h2>
        <p className="mt-1 text-caption text-text-muted">
          No appeals yet. Status changes are final and land in the audit log.
        </p>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Optional reason"
          className="mt-4 h-10 w-full max-w-md rounded-full border border-border bg-bg px-4 text-label"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={row.status === "active" || setStatus.isPending}
            onClick={() => changeStatus("active")}
          >
            Reinstate
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={row.status === "suspended" || setStatus.isPending}
            onClick={() => changeStatus("suspended")}
          >
            Suspend
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={row.status === "banned" || setStatus.isPending}
            onClick={() => changeStatus("banned")}
          >
            Ban
          </Button>
        </div>
        {setStatus.error ? (
          <p className="mt-3 text-caption text-danger">{setStatus.error.message}</p>
        ) : null}
      </Card>

      <Card>
        <div className="border-b border-border p-5">
          <h2 className="text-heading">Posts</h2>
          <p className="text-caption text-text-muted">Including removed. Take content down here.</p>
        </div>
        {posts.data?.items.length === 0 ? <EmptyState title="No posts" /> : null}
        {posts.data?.items.map((post) => (
          <div
            key={post.id}
            className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-0"
          >
            <div className="min-w-0">
              <p className="truncate text-label">{post.caption || "Untitled"}</p>
              <p className="text-caption text-text-muted">
                {post.mediaType} · {formatNumber(post.likeCount)} likes · {formatDate(post.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <StatusPill value={post.status} />
              {post.status !== "removed" ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={removePost.isPending}
                  onClick={async () => {
                    if (!confirm("Remove this post and reverse its Aura?")) return;
                    await removePost.mutateAsync({ postId: post.id, reason: reason || undefined });
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  numeric,
}: {
  label: string;
  value: ReactNode;
  numeric?: boolean;
}) {
  return (
    <Card className="p-5">
      <p className="text-caption text-text-muted">{label}</p>
      <div className={`mt-2 text-label ${numeric ? "aura-numerals text-heading" : ""}`}>{value}</div>
    </Card>
  );
}

function ButtonLinkFallback() {
  return (
    <Link href="/" className="text-caption text-text-muted hover:text-text">
      ← Dashboard
    </Link>
  );
}
