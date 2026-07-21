# FormFlow

A conversational form & survey builder platform — Typeform/Youform-style SaaS.

## Project structure

```
formflow/
├── backend/                    # Node.js/Express API
│   ├── src/
│   │   ├── index.js            # App entry point
│   │   ├── lib/
│   │   │   ├── supabase.js     # Supabase clients (anon + service role)
│   │   │   ├── plans.js        # Plan limits & feature gates
│   │   │   └── logger.js       # Winston logger
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verification, role checks
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── forms.js        # Form + question CRUD
│   │   │   ├── responses.js    # Response ingestion + dashboard + CSV export
│   │   │   ├── workspaces.js   # Workspace + member + invite management
│   │   │   ├── integrations.js # Google Sheets, Slack, webhooks
│   │   │   ├── billing.js      # Stripe checkout, portal, webhooks
│   │   │   └── templates.js    # Template gallery
│   │   ├── services/
│   │   │   └── email.js        # Resend email service
│   │   └── jobs/
│   │       └── queues.js       # BullMQ queues + workers
│   ├── .env.example
│   └── package.json
│
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql   # Full schema with RLS
        └── 002_seed_data.sql        # Templates + plan docs
```

## Quick start

### 1. Supabase setup
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push
```

### 2. Backend setup
```bash
cd backend
cp .env.example .env
# Fill in all env vars

npm install
npm run dev
```

### 3. Redis (local dev)
```bash
# macOS
brew install redis && brew services start redis

# Or use Upstash free tier (cloud Redis)
# Set REDIS_URL=rediss://... in .env
```

## API Overview

### Public endpoints (no auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/public/forms/:slug` | Fetch published form for rendering |
| POST | `/api/public/forms/:formId/start` | Track form start |
| POST | `/api/public/forms/:formId/responses` | Submit a response |
| POST | `/api/public/forms/:formId/responses/partial` | Save partial response |
| GET | `/api/templates` | List templates |

### Authenticated endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workspaces` | List user's workspaces |
| POST | `/api/workspaces` | Create workspace |
| GET | `/api/workspaces/:id/forms` | List forms |
| POST | `/api/workspaces/:id/forms` | Create form |
| GET | `/api/forms/:id` | Get form + questions |
| PATCH | `/api/forms/:id` | Update form |
| PUT | `/api/forms/:id/questions` | Save all questions |
| GET | `/api/forms/:id/responses` | List responses |
| GET | `/api/forms/:id/responses/export/csv` | Export CSV |
| GET | `/api/forms/:id/analytics` | Analytics |
| POST | `/api/billing/:workspaceId/checkout` | Start Stripe checkout |
| POST | `/api/billing/:workspaceId/portal` | Stripe billing portal |
| POST | `/api/billing/webhooks` | Stripe webhook receiver |

## Environment variables

See `backend/.env.example` for the full list.

## Next steps (Phase 2 — Frontend)

- `frontend/` — React + Vite form builder SPA
- `renderer/` — Next.js SSR public form renderer

## Tech stack
- **API**: Node.js 20, Express 4, ES modules
- **Database**: Supabase (PostgreSQL + RLS)
- **Queue**: BullMQ + Redis (Upstash)
- **Email**: Resend
- **Billing**: Stripe
- **Deploy**: Railway/Render (API), Vercel (Frontend)
