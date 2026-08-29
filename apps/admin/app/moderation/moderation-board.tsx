"use client";

import Link from "next/link";
import { useState } from "react";

import { EmptyState, QueryError } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useModerationActions, usePosts, useRemovePost, useReports, useResolveReport } from "@/lib/api/hooks";
import type { PostStatus, ReportStatus } from "@/lib/api/types";
import { formatDate, formatNumber } from "@/lib/format";

const PAGE_SIZE = 20;

export function ModerationBoard() {
  const [reportStatus, setReportStatus] = useState<ReportStatus | "">("open");
  const [reportOffset, setReportOffset] = useState(0);
  const [postStatus, setPostStatus] = useState<PostStatus | "">("published");
  const [postQuery, setPostQuery] = useState("");
  const [postOffset, setPostOffset] = useState(0);

  const reports = useReports({
    status: reportStatus || undefined,
    offset: reportOffset,
    limit: PAGE_SIZE,
  });
  const posts = usePosts({
    q: postQuery.trim() || undefined,
    status: postStatus || undefined,
    offset: postOffset,
    limit: PAGE_SIZE,
  });
  const actions = useModerationActions({ offset: 0, limit: 15 });
  const resolve = useResolveReport();
  const removePost = useRemovePost();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-title">Moderation</h1>
        <p className="mt-1 text-body text-text-secondary">
          Reports, content takedowns, and the audit log. Appeals are not built yet —
          every action is already recorded so that flow can plug in later.
        </p>
      </header>

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-heading">Reports</h2>
            <p className="text-caption text-text-muted">User-submitted. Dismiss or mark handled after you act.</p>
          </div>
          <select
            value={reportStatus}
            onChange={(event) => {
              setReportStatus(event.target.value as ReportStatus | "");
              setReportOffset(0);
            }}
            className="h-10 rounded-full border border-border bg-bg px-4 text-label"
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="dismissed">Dismissed</option>
            <option value="actioned">Actioned</option>
          </select>
        </div>
        {reports.error ? (
          <div className="p-5">
            <QueryError message={reports.error.message} />
          </div>
        ) : null}
        {reports.data?.items.length === 0 ? <EmptyState title="No reports in this filter" /> : null}
        {reports.data?.items.map((report) => (
          <div
            key={report.id}
            className="flex flex-col gap-3 border-b border-border px-5 py-4 last:border-0 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="text-label">
                @{report.reporterUsername} reported a {report.targetType}
              </p>
              <p className="text-caption text-text-muted">
                {report.reason}
                {report.note ? ` · ${report.note}` : ""} · {formatDate(report.createdAt)}
              </p>
              <p className="mt-1 text-caption">
                {report.targetType === "user" ? (
                  <Link href={`/users/${report.targetId}`} className="text-aura-bright">
                    Open user
                  </Link>
                ) : (
                  <span className="text-text-secondary">Post {report.targetId}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill value={report.status} />
              {report.status === "open" ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={resolve.isPending}
                    onClick={() => resolve.mutate({ reportId: report.id, decision: "dismiss" })}
                  >
                    Dismiss
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={resolve.isPending}
                    onClick={() => resolve.mutate({ reportId: report.id, decision: "action" })}
                  >
                    Mark handled
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ))}
        {reports.data ? (
          <Pagination
            offset={reports.data.offset}
            limit={reports.data.limit}
            total={reports.data.total}
            onPage={setReportOffset}
          />
        ) : null}
      </Card>

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-heading">Posts</h2>
            <p className="text-caption text-text-muted">Remove content. Aura earned on the post is reversed.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={postQuery}
              onChange={(event) => {
                setPostQuery(event.target.value);
                setPostOffset(0);
              }}
              placeholder="Caption or @username"
              className="h-10 rounded-full border border-border bg-bg px-4 text-label"
            />
            <select
              value={postStatus}
              onChange={(event) => {
                setPostStatus(event.target.value as PostStatus | "");
                setPostOffset(0);
              }}
              className="h-10 rounded-full border border-border bg-bg px-4 text-label"
            >
              <option value="">All</option>
              <option value="published">Published</option>
              <option value="removed">Removed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
        {posts.data?.items.length === 0 ? <EmptyState title="No posts" /> : null}
        {posts.data?.items.map((post) => (
          <div
            key={post.id}
            className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-0"
          >
            <div className="min-w-0">
              <Link href={`/users/${post.author.id}`} className="text-label hover:text-aura-bright">
                @{post.author.username}
              </Link>
              <p className="truncate text-caption text-text-secondary">{post.caption || "Untitled"}</p>
              <p className="text-caption text-text-muted">
                {formatNumber(post.likeCount)} likes · {formatDate(post.createdAt)}
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
                    await removePost.mutateAsync({ postId: post.id });
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        {posts.data ? (
          <Pagination
            offset={posts.data.offset}
            limit={posts.data.limit}
            total={posts.data.total}
            onPage={setPostOffset}
          />
        ) : null}
      </Card>

      <Card>
        <div className="border-b border-border p-5">
          <h2 className="text-heading">Audit log</h2>
          <p className="text-caption text-text-muted">
            Append-only. A future appeal would point at one of these rows.
          </p>
        </div>
        {actions.data?.items.length === 0 ? <EmptyState title="No actions yet" /> : null}
        {actions.data?.items.map((action) => (
          <div key={action.id} className="flex items-start justify-between gap-4 border-b border-border px-5 py-3 last:border-0">
            <div>
              <p className="text-label">{action.action.replaceAll("_", " ")}</p>
              <p className="text-caption text-text-muted">
                {action.targetType} {action.targetId}
                {action.reason ? ` · ${action.reason}` : ""}
              </p>
            </div>
            <p className="shrink-0 text-caption text-text-secondary">{formatDate(action.createdAt)}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}
