"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState, QueryError } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { StatusPill } from "@/components/status-pill";
import { Card } from "@/components/ui/card";
import { useStats, useUsers } from "@/lib/api/hooks";
import type { UserStatus } from "@/lib/api/types";
import { formatDate, formatNumber } from "@/lib/format";

const PAGE_SIZE = 25;

export function Dashboard() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [offset, setOffset] = useState(0);
  const stats = useStats();
  const users = useUsers({
    q: q.trim() || undefined,
    status: status || undefined,
    offset,
    limit: PAGE_SIZE,
  });

  const cards = useMemo(() => {
    if (!stats.data) return [];
    const { users: u, posts, votes, reports } = stats.data;
    return [
      { label: "Users", value: u.total, hint: `${formatNumber(u.createdLast7Days)} new this week` },
      { label: "Active", value: u.active, hint: `${formatNumber(u.suspended)} suspended · ${formatNumber(u.banned)} banned` },
      { label: "Published posts", value: posts.published, hint: `${formatNumber(posts.removed)} removed` },
      { label: "Votes", value: votes.total, hint: `${formatNumber(votes.last7Days)} this week` },
      { label: "Open reports", value: reports.open, hint: `${formatNumber(reports.actioned)} actioned` },
    ];
  }, [stats.data]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-title">Dashboard</h1>
        <p className="mt-1 text-body text-text-secondary">
          Consumer users and global stats. Content actions live in Moderation.
        </p>
      </header>

      {stats.error ? <QueryError message={stats.error.message} /> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-caption text-text-muted">{card.label}</p>
            <p className="mt-2 text-heading aura-numerals">{formatNumber(card.value)}</p>
            <p className="mt-1 text-caption text-text-secondary">{card.hint}</p>
          </Card>
        ))}
        {stats.isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} className="h-28 animate-pulse bg-surface-elevated" />
            ))
          : null}
      </section>

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-heading">Users</h2>
            <p className="text-caption text-text-muted">The consumer table. Staff is not mixed in.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setOffset(0);
              }}
              placeholder="Search username, name, email"
              className="h-10 rounded-full border border-border bg-bg px-4 text-label text-text placeholder:text-text-muted"
            />
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as UserStatus | "");
                setOffset(0);
              }}
              className="h-10 rounded-full border border-border bg-bg px-4 text-label text-text"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>

        {users.error ? (
          <div className="p-5">
            <QueryError message={users.error.message} />
          </div>
        ) : null}

        {users.data && users.data.items.length === 0 ? (
          <EmptyState title="No users match" body="Try a different search or status." />
        ) : null}

        {users.data && users.data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="text-caption uppercase tracking-wide text-text-muted">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Aura</th>
                  <th className="px-5 py-3 font-medium">Posts</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.data.items.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/users/${user.id}`} className="text-label text-text hover:text-aura-bright">
                        @{user.username}
                      </Link>
                      <p className="text-caption text-text-muted">{user.email ?? user.displayName ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill value={user.status} />
                    </td>
                    <td className="px-5 py-3 aura-numerals text-label">{formatNumber(user.aura)}</td>
                    <td className="px-5 py-3 text-label">{formatNumber(user.postCount)}</td>
                    <td className="px-5 py-3 text-caption text-text-secondary">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              offset={users.data.offset}
              limit={users.data.limit}
              total={users.data.total}
              onPage={setOffset}
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
