# Redesign screenshots

Source of truth for the vote/receipts UI. Implement against these files. Product economy rules stay in [redesign-tracker.md](../redesign-tracker.md) (Q1–Q20). If a mock number is outside ±100, **implement the lock**, not the mock.

## Index

| # | File | What it is |
|---|---|---|
| 01 | [01_tab_bar_home_profile.png](./01_tab_bar_home_profile.png) | Bottom nav: **HOME** (active, neon green) \| **PROFILE** (inactive). Two tabs. No Create tab, no Discover, no Rank. |
| 02 | [02_live_check_feed_ledger.png](./02_live_check_feed_ledger.png) | Full **LIVE CHECK** frame: header + gear, video, right-edge slider, floating receipts, **RECEIPT LEDGER** list, HOME/PROFILE bar. |
| 03 | [03_slider_state_01_stationary.png](./03_slider_state_01_stationary.png) | Slider **idle**: grey track, grey thumb at mid, no value. |
| 04 | [04_slider_state_02_active.png](./04_slider_state_02_active.png) | Slider **touched at 0**: neon green track + thumb, `+0` label. Release here is a cancel (Q2). |
| 05 | [05_slider_state_03_positive.png](./05_slider_state_03_positive.png) | Slider **charging up**: neon green fill below thumb, large `+N`. Mock shows `+450` — **cap is ±100** (Q7). |
| 06 | [06_slider_state_04_cook.png](./06_slider_state_04_cook.png) | Slider **charging down** (“COOK”): pure red, large `−85`, “DROP A RECEIPT” cue. |
| 07 | [07_receipt_composer_negative.png](./07_receipt_composer_negative.png) | Receipt composer over the video while the slider is at `−85`. Mock copy says required — **product lock is optional** (Q3/Q4). |
| 08 | [08_profile_blank_slate.png](./08_profile_blank_slate.png) | Own profile at **0 Aura**: square portrait, `@BASELINE_USER`, POST BASELINE, empty posts, PROFILE tab active with a `0` badge. |
| 09 | [09_feed_header_cooked_live_check_certified.png](./09_feed_header_cooked_live_check_certified.png) | Top swipe chrome, **left → right**: `COOKED` · **`LIVE CHECK`** (active) · `CERTIFIED`. |

## Notes for later implementation

- Bottom bar is two tabs (Home / Profile). Create is not in the bar in these screens; the empty profile uses **POST BASELINE**.
- Home’s three feeds are a **horizontal header swipe**, not extra bottom tabs. Last screenshot is that swipe.
- Ledger in `02` sits **in the feed frame** (collapsible “RECEIPT LEDGER”), not only as a 70% sheet.
- Overlay/ledger mock amounts (`+200`, `+500`, `−150`, `+450`) are over the locked ±100 cap. Clamp in product; restyle the mock numbers when building.
