import { AURA_GLYPH } from "@/lib/aura";
import { cn } from "@/lib/cn";
import { formatAura } from "@/lib/format";

type AuraValueSize = "sm" | "md" | "lg" | "xl";

const sizes: Record<AuraValueSize, string> = {
  sm: "text-caption",
  md: "text-label",
  lg: "text-heading",
  xl: "text-title",
};

type AuraValueProps = {
  value: number;
  size?: AuraValueSize;
  /** Renders the trailing "Aura" word. Off by default: the glyph carries it. */
  showUnit?: boolean;
  tone?: keyof typeof tones;
  className?: string;
};

const tones = {
  default: "text-text",
  secondary: "text-text-secondary",
  aura: "text-aura-bright",
} as const;

export function AuraValue({
  value,
  size = "md",
  showUnit = false,
  tone = "default",
  className,
}: AuraValueProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        sizes[size],
        tones[tone],
        className,
      )}
    >
      <span aria-hidden className="leading-none">
        {AURA_GLYPH}
      </span>
      <span className="aura-numerals">{formatAura(value)}</span>
      {showUnit ? (
        <span className="font-medium text-text-secondary">Aura</span>
      ) : (
        <span className="sr-only">Aura</span>
      )}
    </span>
  );
}
