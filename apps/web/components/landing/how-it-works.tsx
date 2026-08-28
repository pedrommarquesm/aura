import { Section } from "@/components/landing/section";

const STEPS = [
  {
    label: "Discover",
    body: "Open the feed. Photos and videos, ordered by what is gaining Aura fastest right now.",
  },
  {
    label: "Like",
    body: "One tap. The like registers instantly — nothing sits there waiting on a spinner.",
  },
  {
    label: "Gain Aura",
    body: "The creator is paid in Aura the moment you tap, and the number moves in front of you.",
  },
  {
    label: "Climb",
    body: "Your total decides your place on the global board. You can always see your exact rank.",
  },
  {
    label: "Post",
    body: "Then it is your turn. Camera, caption, published in seconds — and the loop starts again.",
  },
];

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      eyebrow="The loop"
      title="How it works"
      description="Five steps, and the fifth one sends you back to the first. That loop is the whole product."
    >
      <ol className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, index) => (
          <li
            key={step.label}
            className="flex flex-col gap-3 bg-surface p-6 transition-colors duration-(--motion-quick) ease-out hover:bg-surface-elevated"
          >
            <span
              aria-hidden
              className="aura-numerals text-caption text-aura-bright"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-heading">{step.label}</h3>
            <p className="text-body text-text-secondary">{step.body}</p>
          </li>
        ))}
      </ol>

      <p className="mt-6 flex items-center gap-3 text-label text-text-muted">
        <span aria-hidden className="h-px w-8 bg-aura" />
        Repeat. That is the game.
      </p>
    </Section>
  );
}
