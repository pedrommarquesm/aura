import { Section } from "@/components/landing/section";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";

const POINTS = [
  {
    title: "One number, everywhere",
    body: "Your Aura sits next to your name in the feed, on your profile and on the leaderboard. There is no other score to explain.",
  },
  {
    title: "Likes pay out",
    body: "Every like on your post credits Aura to you the moment it lands. Not a vanity counter that resets — a balance that only goes up as people back your content.",
  },
  {
    title: "Kept on the record",
    body: "Aura is a ledger, not a tally. Each point traces back to the like that created it, so a fake like can be reversed and the board stays worth climbing.",
  },
];

export function WhatIsAura() {
  return (
    <Section
      id="what-is-aura"
      eyebrow="The idea"
      title="What is Aura?"
      description="Aura is a score you can only get from other people. You cannot buy it and nobody hands it to you. It comes from likes, and it is public."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {POINTS.map((point) => (
          <Card key={point.title} className="h-full">
            <CardHeader>
              <CardTitle>{point.title}</CardTitle>
              <CardDescription>{point.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <figure className="mt-12 border-l-2 border-aura pl-6 sm:mt-16">
        <blockquote className="max-w-3xl text-heading text-balance sm:text-title">
          Aura is not a social network with gamification. It is a social game
          where the social network is the game board.
        </blockquote>
      </figure>
    </Section>
  );
}
