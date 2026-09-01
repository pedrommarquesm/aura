# Aura Battles — Google Stitch design brief

A design brief and ready-to-paste [Stitch](https://stitch.withgoogle.com)
prompts for the mechanic designed in
[aura-battles-plan.md](./aura-battles-plan.md). That doc is the product/data
spec. This doc is "hand it to a design tool" — vocabulary, screen inventory,
style direction, and the actual prompts.

Nothing here is final. It's a starting point for Stitch to generate
something arguable, not a spec Stitch must obey exactly.

---

## 1. Vocabulary — answering the specific questions

### "We don't have Likes, we have Aura. We give aura, we award aura to others."

Confirmed, and already true in the shipped copy (`"You give it Aura"` — landing
`play.steps.like`). Locking the verbs so Stitch (and whoever writes the real
copy later) doesn't drift:

| Moment | Verb | Who acts |
|---|---|---|
| Tapping/double-tapping a solo Farm post | **Give Aura** | The viewer, directly. This is today's mechanic, unchanged. |
| Voting on a Battle | **Give Aura** (to the side you pick) | The viewer. Same verb, same action, same cost to the voter as today: zero. |
| The system crediting a battle's stake to the winner once voting closes | **Award Aura** | The system, on decision. Notification copy: *"You were awarded +50 Aura"* — the individual votes are folded into one payout, not narrated as "@leo gave you Aura." |
| A challenger overtaking the current champion | **Dethrone** | Narrative copy only (notifications, Lineage screen), not a button. |

Correction from an earlier draft of this brief, which used "Back" as the vote
verb — wrong, and directly contradicts the instruction that started this
section. Fixed everywhere below. It also resolves cleanly against the
mechanic that already ships: giving Aura on a normal post already costs the
tapper nothing while creating Aura for someone else. Voting in a battle is
the identical shape — tap 🗿 on the side you think should win, they might
gain Aura, you don't spend any. No new verb, no new economics.

### "Should the like be the Moai emoji 🗿?"

Already decided, already shipped — don't reopen it. `AURA_GLYPH = '🗿'` exists
today in both `apps/web/lib/aura.ts` and `apps/mobile/components/ui/aura-value.tsx`,
and `brand.md` already states *"Moai (🗿) stays the score glyph."* Every new
screen in this brief reuses 🗿 as-is.

### "About negative aura, should we have a dislike, the 💀 emoji?"

**Recommendation: no universal dislike button on regular posts. Yes, use 💀 —
but scoped to a decided Battle, not as a standalone reaction on any post.**

Reasoning: a Reddit/YouTube-style downvote on ordinary posts is a real
harassment surface, and it argues with the design decision already locked in
`aura-battles-plan.md` §5 — a normal Farm post outside a battle should stay a
low-stakes, only-upside thing to post. "Negative aura" in the actual meme is
never a judgment on a lone post; it's always relative, said *because* someone
just lost a comparison. So give it a home exactly there:

- The **losing clip in a decided Battle** gets stamped with 💀 (small badge,
  replacing the vote bar once the battle closes).
- The **Lineage screen**'s defeated-challengers list shows 💀 next to each
  loss, alongside the battle-scoped negative number (`-30`, `-75`…) — this is
  where "-9000 aura" as a joke actually lives, per §5's decision that it
  never touches lifetime Aura.
- Not a persistent icon next to every post's 🗿 count. If that turns out to
  feel incomplete once this is real, the fallback is a **zero-effect** comedic
  reaction (💀 as a reaction option in comments, purely social, no Aura
  attached) — worth testing later, not day one.

---

## 2. Design style — and why "not gamified" is the hard part here

The existing brand is already dark, violet-glow, bold type (`--color-bg
#0A0A0F`, `--color-aura #8B5CF6`/`#A78BFA`/`#6D28D9`, Inter, generous radius —
see `apps/web/app/globals.css`). Battles adds win/lose states, scores, and a
bracket — exactly the surface area that turns into Duolingo-style gamification
if you're not deliberate about it. Concretely, avoid:

- XP bars, level-up modals, confetti bursts, badge walls, streak flames
- A different bright color per category (that's a mobile-game palette, not
  a brand)
- Mascots, cartoon iconography, anything that reads as a kids' app
- Numbers everywhere — a battle needs exactly one number in view at a time
  (the vote split, or the Aura at stake), not four counters competing

Aim instead for **restraint that still feels alive**: the reward is motion and
typography (a number ticking up, a glow pulse, one satisfying beat on a win),
not stickers. Think less "mobile game," more "the UI a real sports app or a
high-end streetwear drop page would use if the sport were made up."

### Three variants worth having Stitch actually generate

Don't lock one before seeing them side by side. Same content, three
different feelings:

**A. Cinematic Minimal (my starting recommendation).** Current direction,
refined. Near-black backgrounds, one accent (violet) plus one hard-stop for
loss states (red, already `--color-danger`), soft glow only on the thing
that matters right now (the winning side, an active timer), everything else
flat and quiet. Typography does the work — big, bold Aura numbers, small
quiet labels. 🗿 is the only recurring illustrated motif; no other iconography
family competing with it.

**B. Neo-Brutalist Sports Ticket.** Higher contrast, thicker borders, a
condensed/mono type for scores (reads like a scoreboard or a fight-poster
ticket stub), harder edges instead of glow. Treats each Battle like a boxing
match card — "@maya vs @leo," tale-of-the-tape style stats. More graphic,
less soft; risk is it can tip toward looking like a sports-betting app if the
type gets too loud.

**C. Editorial Zine.** Lighter touch overall — more whitespace, a battle
reads like a magazine feature spread (large photography, a caption treated
like a pull-quote) rather than a scoreboard. Least "app-like," most likely to
avoid feeling gamified almost by construction, but needs real photography/UGC
to look good — it will look empty with placeholder content.

**Recommendation: generate A first** (closest to what's shipped, lowest risk,
fastest to compare against the current app), **then B for one battle-specific
screen only** (the VS card reads naturally as a fight card — worth seeing if
it's better *just there* without redoing the whole app), and treat C as a
stretch exploration rather than a real contender unless there's real content
to fill it.

---

## 3. Navigation — where Battles actually live

Today: 5 tabs, `Home / Discover / Create / Rank / Profile`
(`apps/mobile/app/(tabs)/_layout.tsx`). The tab bar code already has a comment
flagging that labels are tight across locales at 5 tabs — a 6th tab is a real
cost, not a free add.

Also worth knowing before picking a pattern: **Discover already has a
reserved, empty "Battles" section** — `discover.tsx` renders a
`discover.battles.title` / `discover.battles.subtitle` block with two
skeleton placeholders today, and the code comment literally says *"Challenges
and battles are V1 (roadmap `API-32`, `API-33`); the tiles exist so the shell
reads as the product instead of an empty tab."* Whoever built the shell
already expected this. Use the slot that's already there before inventing a
new one.

**Variant 1 — no new tab (recommended starting point).** Battles surface
inline: VS cards appear in the Home feed like any other card; Discover's
already-reserved Battles section fills in with live content; Profile gains a
Battle Record module; a Lineage/My Battles screen is reached by drilling in,
not by a tab. Lowest disruption, reuses what's already stubbed.

**Variant 2 — a 6th tab.** Dedicated `Battles` tab (icon: two 🗿 facing off, or
crossed swords) housing Discover's battle section, Aura Cup, and My Battles
in one place. Gives the mechanic real prominence if it becomes the core loop
— but costs a tab slot the layout comment already says is tight, and
competes directly with `Rank` for the same "competitive" mental space.

**Variant 3 — merge into Rank.** Rename `Rank` → something like `Arena` or
`Compete`, add a segmented control at the top switching **Leaderboard /
Battles**. No new tab, and groups every versus/ranked surface under one
icon — but risks burying whichever segment isn't the default, and leaderboard
and battles are different enough intents (one is a static standing, one is
an active thing you do) that merging them may just be confusing.

**Recommendation:** ship Variant 1 first — it costs nothing structurally and
uses a slot that already exists. Revisit Variant 3 only if usage data shows
people can't find Battles inside Discover/Home.

---

## 4. Screen inventory

Marked **existing** (needs edits, doesn't need a from-scratch design),
**new** (doesn't exist yet), or **already stubbed** (a placeholder already
lives in the code, per §3).

### Web

| Screen | Status | What changes |
|---|---|---|
| Landing page | existing | New "How Battles Work" 4-step section + a live vote demo next to the existing double-tap demo. Full copy plan in `aura-battles-plan.md` §9. |
| Public post permalink (`/a/:username/post/:id`) | existing | Add a **Challengers** module below the post — every Battle spawned from it, with live/decided state and the current split. |
| Public battle permalink (`/a/:username/battle/:id`) | new | Mirrors the post permalink pattern: viewable signed out, voting requires sign-in. |
| Leaderboard page | existing | Add a **Battle Record** module (wins / current reigns) alongside the lifetime-Aura board — two different rankings, don't merge the numbers. |

### Mobile

| Screen | Status | What changes |
|---|---|---|
| Home / Feed | existing | VS Battle Cards render inline as a distinct card type. Add a bell icon (no notifications entry point exists today) to the header for Notifications. |
| Discover | **already stubbed** | The reserved `discover.battles` section gets real content: live VS cards and/or Aura Cup entries, replacing the two skeletons. The existing `discover.challenges` horizontal scroller (mock titles like "Absolute Cinema," "Coldest Aura") is close to Aura Cup already — decide if it *is* Aura Cup or a separate thing before building both. |
| Search | new (sub-flow) | Reached from Discover's search icon. Users + hashtags, reusing the existing hashtag route (`app/hashtag/[tag].tsx`). |
| Create | existing | New **Battle Mode** state when opened via a Challenge (deep link from a target post) — same capture pipeline, different framing chrome (mockup already exists, see below). |
| Rank / Leaderboard | existing | Add a Battle Record tab or module next to lifetime Aura, per Variant 1 in §3. |
| Profile (own + others) | existing | Add a Battles section: current reign if any, win/loss record, a link into My Battles. `UserProfile` already has a `showComingSoon` flag — likely where this was expected to land. |
| Post detail | existing (has comments) | Add the same **Challengers** module as the web permalink — this is the hub view for a post's whole battle lineage. |
| **Battle detail (VS voting)** | new | Full-screen version of the feed's VS card — both clips, vote UI, live split, time left. |
| **Challenge camera** | new | Capture screen anchored to a target post, "Battle Mode" framing. |
| **Lineage / Champion** | new | Current champion, fading trail of defeated challengers with 💀 + battle-scoped negative numbers, one Challenge CTA. |
| **My Battles (history)** | new | Reached from Profile. Every battle the user has been in, filterable active/decided, each row showing opponent, result, and Aura awarded. |
| **Notifications** | new | No entry point exists today. Reached via the new bell icon. List: challenged, battle decided, dethroned, plus existing social events (comments etc.) once those get notifications too. |
| **Aura Cup (bracket)** | new | Bracket visualization, current round, the user's entry status, countdown to next round. |
| Settings | existing | Add a **"Who can challenge me"** control (§10 of the plan doc — `challengeable` needs a real UI, not just a default). |

---

## 5. Stitch prompts

Stitch's own guidance is "Zoom-Out-Zoom-In": establish context once, then
refine one screen at a time with short, specific prompts — not one giant
prompt for the whole app. So: paste the **project brief** once to set the
system's context, then paste each **screen prompt** one at a time, in order,
referring back to earlier screens where noted (Stitch keeps conversational
context, so "match the VS card from the feed" works once that screen
exists).

### 5.1 Project brief — paste this first

```text
Design a mobile-first social app called Aura. Dark, cinematic, minimal —
not gamified. No XP bars, no confetti, no badge walls, no mascots, no
rainbow of category colors. One accent color family and one contrast color
for "loss" states, and typography/motion carrying the reward feeling
instead of stickers or icons.

PRODUCT: Users post photos and videos ("Farm"). Other people react to a
post by tapping a moai emoji (🗿), which is the app's one glyph for the
score, called Aura — never call it a "like." The copy verb for that action
is "Give Aura." Aura is public, sits next to every name, and drives one
global leaderboard.

NEW MECHANIC — Battles: anyone can "Challenge" a post by posting their own
video/photo response. That creates a Battle: the two clips side by side,
and the crowd taps the moai emoji on the side they think should win — same
"Give Aura" action and same zero-cost mechanic as a normal post, just
choosing between two sides instead of one. The winner is "Awarded" Aura
once voting closes. Whoever is currently unbeaten on a battle thread is the
"Champion"; a "Lineage" screen
shows the champion and everyone they've beaten. A losing clip in a decided
battle is stamped with a skull emoji (💀) — this is the only negative
signal in the app, and it only appears on a decided battle, never as a
generic dislike button on a normal post.

VISUAL DIRECTION: Near-black background (#0A0A0F), primary accent violet
(#8B5CF6 core, #A78BFA bright, #6D28D9 deep) used for glow/gradient on
primary actions and the Aura number, danger red (#EF4444) reserved only for
loss/decided-battle states, white/near-white text on dark surfaces
(#14141C card surface, #2A2A38 borders). Inter or a similar clean
geometric sans-serif, bold weights for numbers and headings, generous
rounded corners (large radius, ~16-24px), lots of negative space even
though the palette is dark. Bottom tab bar with 5 items: Home, Discover,
Create (center, elevated), Rank, Profile.

TONE: confident, a little dry/funny, Gen-Z internet-native, never
corporate, never cute/mascot-y. Think a high-end streetwear drop page or a
real sports app crossed with TikTok pacing — not a mobile game.

Generate the Home feed screen first: an infinite vertical feed of
full-bleed photo/video posts (username, caption, 🗿 + Aura count, comment
and share icons), plus one post rendered as a distinct "Battle" card type:
a vertical split showing two competing clips side by side with usernames,
a live vote percentage bar in the violet gradient, a "Give Aura" button
with the moai emoji under each side, and small text reading the Aura at
stake. Add a bell icon in the top header for notifications (currently no
notification entry point exists) next to the app wordmark.
```

### 5.2 Screen prompts — paste one at a time, in order

**Battle detail (full-screen vote)**

```text
Now design the full-screen version of that Battle card, opened when someone
taps into it from the feed: both clips large, side by side or a swipeable
split, a bigger live vote-split bar, a countdown to when voting closes, the
Aura at stake shown prominently near the top, and two large "Give Aura"
buttons in the violet gradient with the moai emoji, one under each clip —
the usernames are already visible above each clip, so the buttons
themselves don't need to repeat them. Match the dark, minimal style
already established — no new colors.
```

**Challenge camera**

```text
Design the camera/capture screen for creating a Challenge. At the top, a
small rounded preview thumbnail of the post being challenged with a label
"Challenging @username." Below it, a full-screen camera viewfinder with a
"Battle Mode" pill badge (moai emoji + text) near the top, a large glowing
record button at the bottom center flanked by flash and flip-camera icons,
and a short bold caption under the record button like "Beat their aura."
Same dark, minimal visual language as the feed.
```

**Lineage / Champion screen**

```text
Design a "Lineage" screen for one battle thread. At the top, a hero card
showing the current champion: their photo, a small crown icon, their
username, and a large Aura number next to the moai emoji. Below, a vertical
list of previous challengers who lost to this champion, each row showing a
small photo, username, a skull emoji, and a battle-scoped negative number
(like "-30"), fading in opacity further down the list to suggest history.
One prominent "Challenge @username" button at the bottom. Keep it sparse —
this should read as a scoreboard, not a trophy case.
```

**Discover — Battles section**

```text
Now design the Discover tab. It already has a horizontal scroll of
"Challenge" cards near the top (short prompt title, entry count, a
countdown) and a trending grid of square photo tiles with an Aura count
badge in the corner. Add a "Battles" section below those: two or three live
Battle cards (reuse the same split-screen vote card style from the Home
feed) that are currently open for voting. Add a search icon in the header
that will open a search screen for users and hashtags.
```

**My Battles (profile history)**

```text
Design a "My Battles" screen, reached from the profile. A simple filterable
list (tabs or a segmented control: Active / Decided) of every battle this
person has been in. Each row: the opponent's small photo and username, a
result indicator (won = subtle violet glow, lost = small skull icon, no red
background fill — keep losses quiet, not punishing), and the Aura awarded
for that battle. No progress bars, no streaks, no badges — just a clean
list, like a match history in a sports app.
```

**Notifications**

```text
Design a Notifications screen, reached by tapping a bell icon (new — no
notification entry point exists yet). A simple reverse-chronological list:
"You were challenged by @username," "You won a battle — +50 Aura awarded,"
"@username dethroned your reign," alongside ordinary social notifications
like new comments. Each row has a small avatar, one line of text, a
timestamp, and for battle-related rows a small thumbnail of the relevant
post. Keep the visual weight low — this is a utility screen, not a feed.
```

**Aura Cup bracket**

```text
Design an "Aura Cup" bracket screen for an app-run tournament. Show a
single-elimination bracket for a small number of entries (8 or 16), each
matchup as a compact card with two small thumbnails and a vote split, lines
connecting winners into the next round, and the current round highlighted
while future rounds are dimmed/locked. Include a header with the cup's name
and prompt ("Best Sigma Stare"), a countdown to when the current round's
voting closes, and if the viewer has an entry, a small "Your entry" marker
on their card in the bracket.
```

**Variant exploration (optional, after the above exist)**

```text
Take the Battle detail screen you already generated and create an
alternative visual treatment: higher contrast, thicker borders, a
condensed or monospaced typeface for the scores and usernames, harder
edges instead of soft glow — like a boxing match fight card or a sports
ticket stub. Keep the same layout and content, change only the visual
language. Call this variant "B."
```

---

## 6. What isn't in this brief

- Final copy/microcopy in `pt`, `pt-br`, and `es` — the vocabulary in §1 needs
  translating and added to `i18n.md`'s never-translated list (`Battle`,
  `Challenge`, `Aura Cup` stay as-is in every locale, same rule as `Aura`)
  once the mechanic itself is real.
- Accessibility pass (contrast on the danger-red loss states, motion-reduce
  behavior for the glow/pulse animations) — do this on the real screens, not
  the Stitch draft.
- Any of this shipping before the open decisions in `aura-battles-plan.md`
  §11 are answered, especially whether `challengeable` defaults on or off.
