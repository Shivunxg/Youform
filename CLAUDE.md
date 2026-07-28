# Youform — Claude Code Rules

## Core rule
**Do not change any existing code unless the user explicitly asks for it.**
Fixing a bug does not justify touching unrelated files. Adding a feature does not
justify refactoring nearby code. If you notice something worth improving, flag it
in chat — do not change it silently.

---

## Known fragile areas — never change without explicit instruction

### 1. Supabase FK hints in admin queries (`api/routes/admin.js`)
`workspace_members` has TWO foreign keys to `profiles` (`user_id` and `invited_by`).
PostgREST cannot auto-detect which one to use, so every join involving this pair
**must** carry an explicit hint. Removing the hint causes a silent 400 that surfaces
as wrong data or a 404.

```js
// CORRECT — do not remove !user_id
.select('...workspace_members!user_id(role, workspaces(id, name, plan))')

// CORRECT — do not remove !user_id on the profiles embed
.select('*, workspace_members(role, profiles!user_id(id, email, full_name))')
```

### 2. Single export per function in `api/lib/plans.js`
`hasFeature` must appear exactly once. A previous session accidentally left the
old implementation at the bottom of the file alongside the new one. Two `export
function hasFeature` declarations = JS syntax error = entire API returns 500.

### 3. `requirePlatformAdmin` in `api/lib/auth.js`
Admin access is gated by the `PLATFORM_ADMIN_EMAILS` env var (checked first) and
the `is_platform_admin` column in `profiles` (fallback). Do not remove either check
or change the logic unless explicitly asked.

### 4. `workspace_members!user_id` select in `api/routes/admin.js` — users list
This hint was added in commit `88c5bfe` to fix an ambiguous-relationship error.
It has been accidentally removed twice. Treat it as permanent.

### 5. `isPlanAtLeast` + `FEATURE_MIN_PLAN` plan inheritance (`api/lib/plans.js`, `frontend/src/lib/plans.js`)
Plan inheritance is intentional — business includes all pro features, pro includes
all free features. Do not revert to the old flat per-plan flag lookup.

### 6. `!user_id` hint in the workspace detail query
`/api/admin/workspaces/:id` uses `profiles!user_id(...)` inside the
`workspace_members` embed. Same reason as point 1.

---

## Architecture quick-reference

| Layer | Tech | Notes |
|---|---|---|
| Frontend | React + Vite, TanStack Query, Zustand | `/frontend/src` |
| API | Express on Vercel Serverless | `/api` — entry point `api/index.js` |
| DB | Supabase Postgres + Storage | Migrations in `supabase/migrations/` |
| Auth | Supabase Auth + JWT | Bearer token sent by `api.js` `getHeaders()` |
| Queue | `api/lib/queues.js` | Processes integrations after form submission |

## Environment variables (Vercel)
- `PLATFORM_ADMIN_EMAILS` — comma-separated admin emails, e.g. `shivunxg@gmail.com`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase admin access
- `APP_URL` — public URL, used in Slack/integration links

## Supabase migrations
Migration files in `supabase/migrations/` are **not** auto-applied by Vercel.
They must be run manually in the Supabase SQL Editor or via `supabase db push`.

## Commit discipline
- One concern per commit.
- Never amend a pushed commit.
- Always run `git diff --stat` before committing to verify only intended files changed.
- Prefer small, targeted edits over large file rewrites.
