import Image from "next/image";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";

type AvatarSize = "sm" | "md" | "lg";

const sizes: Record<AvatarSize, { box: string; text: string; px: number }> = {
  sm: { box: "size-8", text: "text-caption", px: 32 },
  md: { box: "size-10", text: "text-label", px: 40 },
  lg: { box: "size-16", text: "text-heading", px: 64 },
};

type AvatarProps = {
  username: string;
  src?: string | null;
  size?: AvatarSize;
  /** Aura ring, for creators we want to single out (top ranks, hero cards). */
  ring?: boolean;
  className?: string;
};

export function Avatar({
  username,
  src,
  size = "md",
  ring = false,
  className,
}: AvatarProps) {
  const t = useTranslations("common");
  const { box, text, px } = sizes[size];
  const initials = username.replace(/^@/, "").slice(0, 2).toUpperCase();

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-elevated select-none",
        box,
        ring && "ring-2 ring-aura ring-offset-2 ring-offset-bg",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={t("avatarAlt", { username })}
          width={px}
          height={px}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden className={cn("text-text-secondary", text)}>
          {initials}
        </span>
      )}
    </span>
  );
}
