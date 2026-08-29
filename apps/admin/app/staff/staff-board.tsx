"use client";

import { useSession } from "next-auth/react";
import { useState, type FormEvent } from "react";

import { EmptyState, QueryError } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useInviteStaff, useStaffList, useUpdateStaff } from "@/lib/api/hooks";
import type { StaffRole } from "@/lib/api/types";
import { formatDate } from "@/lib/format";

export function StaffBoard() {
  const { data: session } = useSession();
  const list = useStaffList();
  const invite = useInviteStaff();
  const update = useUpdateStaff();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<StaffRole, "owner">>("moderator");
  const canManage = session?.staff?.role === "owner" || session?.staff?.role === "admin";

  async function onInvite(event: FormEvent) {
    event.preventDefault();
    await invite.mutateAsync({ email, role });
    setEmail("");
  }

  if (!canManage) {
    return <QueryError message="Only the owner and admins can manage staff." />;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-title">Staff</h1>
        <p className="mt-1 text-body text-text-secondary">
          Invites are by email. They sign in with Google. Org-domain auto-join is
          ready in the API (`STAFF_ALLOWED_DOMAINS`) but off until you set it.
        </p>
      </header>

      <Card className="p-5">
        <h2 className="text-heading">Invite</h2>
        <form onSubmit={onInvite} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@gmail.com"
            className="h-11 flex-1 rounded-full border border-border bg-bg px-4 text-label"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Exclude<StaffRole, "owner">)}
            className="h-11 rounded-full border border-border bg-bg px-4 text-label"
          >
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
          <Button type="submit" disabled={invite.isPending}>
            Invite
          </Button>
        </form>
        {invite.error ? <p className="mt-3 text-caption text-danger">{invite.error.message}</p> : null}
      </Card>

      <Card>
        <div className="border-b border-border p-5">
          <h2 className="text-heading">Members</h2>
        </div>
        {list.error ? (
          <div className="p-5">
            <QueryError message={list.error.message} />
          </div>
        ) : null}
        {list.data?.items.length === 0 ? <EmptyState title="No staff yet" /> : null}
        {list.data?.items.map((member) => (
          <div
            key={member.id}
            className="flex flex-col gap-3 border-b border-border px-5 py-4 last:border-0 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="text-label">{member.displayName ?? member.email}</p>
              <p className="text-caption text-text-muted">
                {member.email} · last login {formatDate(member.lastLoginAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill value={member.role} />
              <StatusPill value={member.status} />
              {member.role !== "owner" ? (
                <>
                  {member.status !== "deactivated" ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={update.isPending}
                      onClick={() => {
                        if (!confirm(`Deactivate ${member.email}?`)) return;
                        update.mutate({ staffId: member.id, status: "deactivated" });
                      }}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ staffId: member.id, status: "invited" })}
                    >
                      Re-invite
                    </Button>
                  )}
                </>
              ) : (
                <span className="text-caption text-text-muted">GOD · immutable</span>
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
