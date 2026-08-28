import { useTranslations } from "next-intl";

import { Section } from "@/components/landing/section";
import { AURA_LEVELS } from "@/lib/aura";

/**
 * The ladder from the product spec (§20). The titles stay in English in every
 * locale; only the thresholds are formatted per locale.
 */
export function Levels() {
  const t = useTranslations("about.levels");

  // The ladder is stored highest-first for lookups; it reads bottom-up.
  const levels = [...AURA_LEVELS].reverse();

  return (
    <Section
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <ol className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {levels.map((level) => (
          <li
            key={level.title}
            className="flex flex-col gap-1.5 bg-surface p-6 transition-colors duration-(--motion-quick) ease-out hover:bg-surface-elevated"
          >
            <h3 className="text-heading">{level.title}</h3>
            <p className="aura-numerals text-caption text-text-muted">
              {level.threshold === 0
                ? t("start")
                : t("from", { aura: level.threshold })}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
