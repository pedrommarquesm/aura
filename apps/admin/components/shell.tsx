"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/moderation", label: "Moderation" },
  { href: "/staff", label: "Staff", roles: ["owner", "admin"] as const },
];

function visible(roles: readonly string[] | undefined, role: string | undefined): boolean {
  return !roles || Boolean(role && roles.includes(role));
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data } = useSession();
  const role = data?.staff?.role;

  return (
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
        <Link href="/" className="px-3 text-heading text-aura-gradient">
          Aura Admin
        </Link>
        <p className="mt-1 px-3 text-caption text-text-muted">Backoffice</p>
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.filter((item) => visible(item.roles, role)).map(
            (item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-label transition-colors duration-(--motion-quick)",
                    active
                      ? "bg-surface-elevated text-text"
                      : "text-text-secondary hover:bg-surface-elevated hover:text-text",
                  )}
                >
                  {item.label}
                </Link>
              );
            },
          )}
        </nav>
        <div className="mt-auto space-y-3 px-3">
          <div>
            <p className="text-label text-text">{data?.staff?.displayName ?? data?.staff?.email}</p>
            <p className="text-caption capitalize text-text-muted">{data?.staff?.role}</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </Button>
        </div>
      </aside>
      <div className="md:pl-60">
        <header className="flex items-center justify-between border-b border-border px-4 py-4 md:hidden">
          <Link href="/" className="text-label text-aura-gradient">
            Aura Admin
          </Link>
          <nav className="flex gap-3 text-caption">
            {NAV.filter((item) => visible(item.roles, role)).map((item) => (
              <Link key={item.href} href={item.href} className="text-text-secondary">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
