"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { SettingsIcon } from "@/components/icons";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/**
 * Language lives in this menu, not in the header chrome. The trigger is a
 * real `/settings` link so the switcher stays reachable without JavaScript.
 */
export function SettingsMenu() {
  const t = useTranslations("settings");
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <Link
        href="/settings"
        aria-label={t("open")}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-full text-text-secondary",
          "transition-colors duration-(--motion-quick) ease-out",
          "hover:bg-surface-elevated hover:text-text",
          open && "bg-surface-elevated text-text",
        )}
        onClick={(event) => {
          event.preventDefault();
          setOpen((current) => !current);
        }}
      >
        <SettingsIcon className="size-5" />
      </Link>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t("title")}
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-surface p-3 shadow-aura-glow-sm"
        >
          <p className="px-1 text-caption text-text-muted">{t("language.title")}</p>
          <div className="mt-2">
            <LocaleSwitcher />
          </div>
        </div>
      ) : null}
    </div>
  );
}
