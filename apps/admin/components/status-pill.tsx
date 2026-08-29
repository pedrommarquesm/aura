import { cn } from "@/lib/cn";

const TONES: Record<string, string> = {
  active: "bg-success/15 text-success",
  published: "bg-success/15 text-success",
  invited: "bg-aura/15 text-aura-bright",
  open: "bg-gold/15 text-gold",
  suspended: "bg-super/15 text-super",
  banned: "bg-danger/15 text-danger",
  deactivated: "bg-danger/15 text-danger",
  removed: "bg-danger/15 text-danger",
  dismissed: "bg-text-muted/15 text-text-muted",
  actioned: "bg-aura/15 text-aura-bright",
  owner: "bg-gold/15 text-gold",
  admin: "bg-aura/15 text-aura-bright",
  moderator: "bg-surface-elevated text-text-secondary",
};

export function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-caption capitalize",
        TONES[value] ?? "bg-surface-elevated text-text-secondary",
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
