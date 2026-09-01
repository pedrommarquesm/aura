# Redesign screenshots

Drop the new UI screenshots here. Implementation of the vote slider and receipts does not start until they land.

Companion tracker: [redesign-tracker.md](../redesign-tracker.md).

## What to add

Any export from Figma / screenshots / screen recordings. Filenames can be messy; the tracker cares about coverage, not naming.

Cover at least:

1. **Feed card, idle** — slider track, live score, chrome. Note whether the moai / heart like control is gone.
2. **Slider charging up** — floating `+N`, haptics implied.
3. **Slider charging down** — floating `−N`.
4. **Release → receipt prompt** — `"Drop a receipt..."` empty and filled.
5. **In-feed receipts** — floating left-side overlays, square avatar, username, text, signed amount.
6. **Receipt ledger** — 70% sheet, every vote, colour-coded amounts.
7. **Own profile at 0 Aura** — including the tab badge if it exists.
8. **Guest vs signed-in** — same card, if they differ.

If the screens also change navigation, feeds, or onboarding (3-tab bar, Live Check / Certified / Cooked, calibration clips, create button), include those too. Those surfaces are **not** in the first implementation cut until a screenshot confirms them — see the tracker, “What actually changes”.

## After upload

1. Tick `RDX-00` in the tracker.
2. Walk `RDX-01` (screenshot vs manifesto) and `RDX-02` (lock the open questions) in the same PR that adds the files, or the next one.
3. Do not start `RDX-10+` until `RDX-02` is `Done`.
