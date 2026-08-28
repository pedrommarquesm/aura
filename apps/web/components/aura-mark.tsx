import { Link } from "@/i18n/navigation";
import { AURA_GLYPH } from "@/lib/aura";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/site";

export function AuraMark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-md bg-aura-gradient text-label shadow-aura-glow-sm"
      >
        {AURA_GLYPH}
      </span>
      <span className="text-heading tracking-tight">{siteConfig.name}</span>
    </Link>
  );
}
