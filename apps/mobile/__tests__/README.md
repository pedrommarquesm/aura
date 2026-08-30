# Mobile flow tests

Jest + React Native Testing Library. Native modules and HTTP are mocked so these run in CI without a device or a live API.

They are written from the **user’s point of view**: what they see and tap, not how a hook is wired.

## How to run

```bash
cd apps/mobile
npm test
```

## Flows we lock in

| #   | Who         | What the user does               | Must keep working                                   |
| --- | ----------- | -------------------------------- | --------------------------------------------------- |
| 1   | Guest       | Opens the home feed              | Latest / Trending chips, post captions, like counts |
| 2   | Guest       | Taps like on a post              | “Sign in to award Aura” — like API is not called    |
| 3   | Guest       | Taps the Create tab              | “Sign in to post” — compose never opens             |
| 4   | Guest       | Opens Profile                    | Sign-in CTA, no private stats                       |
| 5   | Signed in   | Taps like                        | Count updates, no auth sheet                        |
| 6   | Signed in   | Chooses a photo, captions, Posts | Upload + complete + wait until live, then home      |
| 7   | Signed in   | Chooses a video                  | Preview first, “Preparing…”, then Post works        |
| 8   | Signed in   | Picks a video over 60s           | Error on create, nothing uploaded                   |
| 9   | Signed in   | Video still too big after shrink | “too large” on create, nothing uploaded             |
| 10  | Anyone      | Feed empty / feed fails          | Empty copy, error + Try again reloads               |
| 11  | Anyone      | Opens Rank                       | People on the board and Aura scores                 |
| 12  | Signed in   | Profile                          | Stats, own posts, Sign out → guest CTA              |
| 13  | Signed in   | Settings → Português             | UI language switches                                |
| 14  | New account | First open                       | Username claim before the rest of the app           |
| 15  | Signed in   | Taps the comment icon            | Opens the post                                      |
| 16  | Signed in   | Comments on a post (own or other)| Comment is posted, thread and count update          |
| 17  | Guest       | Reads comments / taps Post       | Can read. Writing opens “Sign in to comment”        |
| 18  | Guest       | Signs in from the comment gate   | Lands on the post. Draft is not submitted           |

API mocks live in `helpers/api.ts`. Session helpers in `helpers/session.ts`. Domain `jest.mock` calls are in `jest.api.ts` so they install before any screen is imported.
