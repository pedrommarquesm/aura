# Aura Admin

Staff backoffice. Separate Next.js app, same API and Postgres as the product —
staff identity lives in its own tables and never touches `users`.

## What it does

- **Dashboard** — consumer user table and global stats
- **Moderation** — reports, post takedowns, user suspend/ban, audit log
- **Staff** — invite by email, deactivate. The owner (`pedrommarquesm@gmail.com`) is immutable

Auth is **NextAuth (Auth.js)** wrapping API-issued staff tokens. NextAuth has no
user table. Google is the V0 provider; `/v1/staff/auth/email` is the seam for
org-domain accounts later. Data fetching is **TanStack Query**.

## Local

```bash
# API already running on :3000 with Postgres/Redis
cd apps/admin
cp .env.example .env.local
# set AUTH_GOOGLE_SECRET from the Web OAuth client
npm install
npm run dev                 # http://localhost:3001
```

Add `http://localhost:3001/api/auth/callback/google` as an Authorized redirect
URI on the same Google Web client the public site uses. The API's
`GOOGLE_CLIENT_IDS` must include that client id so it accepts the ID token.

Sign in as `pedrommarquesm@gmail.com` — bootstrapped as owner on first login.

## Layout

```text
auth.ts                 NextAuth config (JWT session, Google → API)
app/api/auth/           NextAuth route handlers
lib/api/hooks.ts        React Query hooks
app/                    Dashboard, user detail, moderation, staff
```
