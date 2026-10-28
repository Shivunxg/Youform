-- ============================================================
-- FormFlow — Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE plan_tier AS ENUM ('free', 'pro', 'business', 'enterprise');

CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

CREATE TYPE question_type AS ENUM (
  'short_text',
  'long_text',
  'multiple_choice',
  'dropdown',
  'rating',
  'nps',
  'yes_no',
  'date',
  'time',
  'file_upload',
  'phone',
  'email',
  'number',
  'address',
  'signature',
  'ranking',
  'matrix',
  'payment',
  'statement',
  'welcome_screen',
  'thank_you_screen'
);

CREATE TYPE form_layout AS ENUM ('conversational', 'classic', 'single_scroll');

CREATE TYPE form_status AS ENUM ('draft', 'published', 'closed', 'archived');

CREATE TYPE integration_type AS ENUM (
  'google_sheets',
  'slack',
  'notion',
  'mailchimp',
  'hubspot',
  'airtable',
  'zapier',
  'webhook',
  'email'
);

CREATE TYPE notification_event AS ENUM ('new_response', 'daily_summary', 'weekly_summary');

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WORKSPACES
-- ============================================================

CREATE TABLE public.workspaces (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  logo_url      TEXT,
  plan          plan_tier NOT NULL DEFAULT 'free',
  -- Stripe
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  subscription_status     TEXT,                        -- active, trialing, past_due, canceled
  plan_expires_at         TIMESTAMPTZ,
  -- Limits (denormalized for fast checks)
  responses_limit         INTEGER NOT NULL DEFAULT 100,
  forms_limit             INTEGER,                     -- NULL = unlimited
  storage_limit_mb        INTEGER NOT NULL DEFAULT 100,
  -- Settings
  custom_domain           TEXT UNIQUE,
  remove_branding         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.workspace_members (
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role          workspace_role NOT NULL DEFAULT 'editor',
  invited_by    UUID REFERENCES public.profiles(id),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE public.workspace_invites (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          workspace_role NOT NULL DEFAULT 'editor',
  invited_by    UUID NOT NULL REFERENCES public.profiles(id),
  token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FORMS
-- ============================================================

CREATE TABLE public.forms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES public.profiles(id),
  title           TEXT NOT NULL DEFAULT 'Untitled form',
  description     TEXT,
  slug            TEXT NOT NULL,                        -- unique within workspace
  status          form_status NOT NULL DEFAULT 'draft',
  layout          form_layout NOT NULL DEFAULT 'conversational',

  -- Theming (stored as JSONB for flexibility)
  theme           JSONB NOT NULL DEFAULT '{
    "primaryColor": "#6366f1",
    "backgroundColor": "#ffffff",
    "fontFamily": "Inter",
    "buttonStyle": "rounded",
    "backgroundImage": null
  }',

  -- Settings
  settings        JSONB NOT NULL DEFAULT '{
    "requireAuth": false,
    "allowMultipleResponses": true,
    "showProgressBar": true,
    "showQuestionNumbers": false,
    "redirectUrl": null,
    "closeMessage": null,
    "metaTitle": null,
    "metaDescription": null
  }',

  -- Access controls
  password_hash   TEXT,                                 -- bcrypt hash for protected forms
  response_limit  INTEGER,                              -- max responses before auto-close
  opens_at        TIMESTAMPTZ,
  closes_at       TIMESTAMPTZ,

  -- Stats (denormalized, updated via triggers/jobs)
  views_count     INTEGER NOT NULL DEFAULT 0,
  starts_count    INTEGER NOT NULL DEFAULT 0,
  responses_count INTEGER NOT NULL DEFAULT 0,

  -- Version tracking
  version         INTEGER NOT NULL DEFAULT 1,
  published_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (workspace_id, slug)
);

-- Form version history (paid feature)
CREATE TABLE public.form_versions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id       UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL,
  snapshot      JSONB NOT NULL,                         -- full form + questions snapshot
  created_by    UUID NOT NULL REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (form_id, version)
);

-- ============================================================
-- QUESTIONS
-- ============================================================

CREATE TABLE public.questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id         UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  type            question_type NOT NULL,
  position        INTEGER NOT NULL,                     -- 0-based ordering
  title           TEXT NOT NULL DEFAULT '',
  description     TEXT,
  required        BOOLEAN NOT NULL DEFAULT FALSE,

  -- Type-specific config (varies by question_type)
  config          JSONB NOT NULL DEFAULT '{}',
  -- Examples by type:
  -- multiple_choice: { "choices": [{"id":"c1","label":"Option A","value":"option_a"}], "allowMultiple": false, "allowOther": false }
  -- rating:          { "steps": 5, "shape": "star", "labels": {"low":"Poor","high":"Excellent"} }
  -- nps:             { "lowLabel": "Not likely", "highLabel": "Extremely likely" }
  -- file_upload:     { "allowedTypes": ["pdf","png","jpg"], "maxSizeMb": 10, "maxFiles": 1 }
  -- matrix:          { "rows": ["Row 1"], "columns": ["Col 1","Col 2"] }
  -- payment:         { "currency": "USD", "amount": null, "priceField": null }
  -- scale/slider:    { "min": 1, "max": 10, "step": 1 }

  -- Validation
  validation      JSONB NOT NULL DEFAULT '{}',
  -- { "minLength": null, "maxLength": null, "pattern": null, "minValue": null, "maxValue": null }

  -- Logic jumps FROM this question
  logic           JSONB NOT NULL DEFAULT '[]',
  -- [{ "condition": { "op": "equals", "value": "yes" }, "action": { "type": "jump", "questionId": "uuid" } }]

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RESPONSES
-- ============================================================

CREATE TABLE public.responses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id         UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id),

  -- Respondent info (optional / anonymous)
  respondent_id   UUID,                                 -- links repeat respondents (cookie-based)
  respondent_email TEXT,

  -- Answer payload — flexible JSONB
  answers         JSONB NOT NULL DEFAULT '{}',
  -- { "<question_id>": { "value": ..., "answeredAt": "ISO", "duration_ms": 1200 } }

  -- Metadata
  is_partial      BOOLEAN NOT NULL DEFAULT FALSE,       -- partial = started but not submitted
  is_test         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Analytics
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at    TIMESTAMPTZ,
  completion_time_ms INTEGER,

  -- Source
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  referrer        TEXT,
  user_agent      TEXT,
  ip_hash         TEXT,                                 -- hashed for privacy

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- File uploads linked to response answers
CREATE TABLE public.response_files (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id     UUID NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES public.questions(id),
  storage_path    TEXT NOT NULL,                        -- supabase storage path
  original_name   TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  size_bytes      BIGINT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INTEGRATIONS
-- ============================================================

CREATE TABLE public.integrations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id         UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id),
  type            integration_type NOT NULL,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  config          JSONB NOT NULL DEFAULT '{}',
  -- google_sheets: { "spreadsheetId": "...", "sheetName": "Sheet1", "oauthTokenId": "..." }
  -- slack:         { "webhookUrl": "...", "channel": "#forms" }
  -- webhook:       { "url": "...", "secret": "...", "headers": {} }
  -- email:         { "to": ["a@b.com"], "subject": "New response" }
  last_triggered_at TIMESTAMPTZ,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OAuth tokens for integrations (Google, Notion, etc.)
CREATE TABLE public.oauth_tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,                        -- 'google', 'notion', etc.
  access_token    TEXT NOT NULL,
  refresh_token   TEXT,
  expires_at      TIMESTAMPTZ,
  scopes          TEXT[],
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, provider)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE public.notification_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id         UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event           notification_event NOT NULL DEFAULT 'new_response',
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  -- Respondent confirmation email config
  send_confirmation     BOOLEAN NOT NULL DEFAULT FALSE,
  confirmation_subject  TEXT,
  confirmation_body     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (form_id, user_id, event)
);

-- ============================================================
-- TEMPLATES
-- ============================================================

CREATE TABLE public.templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL,                        -- 'lead_gen', 'feedback', 'hr', 'event', 'order'
  thumbnail_url   TEXT,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  snapshot        JSONB NOT NULL,                       -- complete form + questions definition
  use_count       INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USAGE TRACKING (for plan limit enforcement)
-- ============================================================

CREATE TABLE public.workspace_usage (
  workspace_id    UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  month           DATE NOT NULL,                        -- first day of billing month
  responses_used  INTEGER NOT NULL DEFAULT 0,
  storage_used_mb NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, month)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Profiles
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Workspaces
CREATE INDEX idx_workspaces_slug ON public.workspaces(slug);
CREATE INDEX idx_workspaces_stripe_customer ON public.workspaces(stripe_customer_id);

-- Workspace members
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);

-- Forms
CREATE INDEX idx_forms_workspace ON public.forms(workspace_id);
CREATE INDEX idx_forms_slug ON public.forms(workspace_id, slug);
CREATE INDEX idx_forms_status ON public.forms(status);
CREATE INDEX idx_forms_created_by ON public.forms(created_by);

-- Questions
CREATE INDEX idx_questions_form ON public.questions(form_id);
CREATE INDEX idx_questions_position ON public.questions(form_id, position);

-- Responses
CREATE INDEX idx_responses_form ON public.responses(form_id);
CREATE INDEX idx_responses_workspace ON public.responses(workspace_id);
CREATE INDEX idx_responses_submitted_at ON public.responses(submitted_at DESC);
CREATE INDEX idx_responses_partial ON public.responses(form_id, is_partial);

-- Response files
CREATE INDEX idx_response_files_response ON public.response_files(response_id);

-- Integrations
CREATE INDEX idx_integrations_form ON public.integrations(form_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at       BEFORE UPDATE ON public.profiles        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_workspaces_updated_at     BEFORE UPDATE ON public.workspaces      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_forms_updated_at          BEFORE UPDATE ON public.forms           FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_questions_updated_at      BEFORE UPDATE ON public.questions       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_responses_updated_at      BEFORE UPDATE ON public.responses       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_integrations_updated_at   BEFORE UPDATE ON public.integrations    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create workspace for new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  ws_id UUID;
  ws_slug TEXT;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Generate unique workspace slug from email prefix
  ws_slug := regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'gi');
  ws_slug := lower(ws_slug) || '-' || substring(gen_random_bytes(4)::text, 3, 6);

  -- Create personal workspace
  INSERT INTO public.workspaces (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s workspace',
    ws_slug
  )
  RETURNING id INTO ws_id;

  -- Add user as owner
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Increment form response count on insert
CREATE OR REPLACE FUNCTION public.increment_response_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_partial = FALSE AND NEW.submitted_at IS NOT NULL THEN
    UPDATE public.forms
    SET responses_count = responses_count + 1
    WHERE id = NEW.form_id;

    -- Update usage tracking
    INSERT INTO public.workspace_usage (workspace_id, month, responses_used)
    VALUES (NEW.workspace_id, date_trunc('month', NOW())::date, 1)
    ON CONFLICT (workspace_id, month)
    DO UPDATE SET
      responses_used = workspace_usage.responses_used + 1,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_count_responses
  AFTER INSERT ON public.responses
  FOR EACH ROW EXECUTE FUNCTION public.increment_response_counts();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_versions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_files       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_usage      ENABLE ROW LEVEL SECURITY;

-- Helper: is user a member of workspace?
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: user's role in workspace
CREATE OR REPLACE FUNCTION public.workspace_member_role(ws_id UUID)
RETURNS workspace_role AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = ws_id AND user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: users see/edit only own profile
CREATE POLICY "profiles_select_own"   ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_update_own"   ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Workspaces: members can read; only owners/admins can update
CREATE POLICY "workspaces_select_member"  ON public.workspaces FOR SELECT USING (public.is_workspace_member(id));
CREATE POLICY "workspaces_update_owner"   ON public.workspaces FOR UPDATE USING (public.workspace_member_role(id) IN ('owner', 'admin'));

-- Workspace members
CREATE POLICY "wm_select_member"  ON public.workspace_members FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "wm_insert_admin"   ON public.workspace_members FOR INSERT WITH CHECK (public.workspace_member_role(workspace_id) IN ('owner', 'admin'));
CREATE POLICY "wm_delete_admin"   ON public.workspace_members FOR DELETE USING (public.workspace_member_role(workspace_id) IN ('owner', 'admin'));

-- Forms: members can read; editors/admins/owners can write
CREATE POLICY "forms_select_member"  ON public.forms FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "forms_insert_editor"  ON public.forms FOR INSERT WITH CHECK (public.workspace_member_role(workspace_id) IN ('owner', 'admin', 'editor'));
CREATE POLICY "forms_update_editor"  ON public.forms FOR UPDATE USING (public.workspace_member_role(workspace_id) IN ('owner', 'admin', 'editor'));
CREATE POLICY "forms_delete_admin"   ON public.forms FOR DELETE USING (public.workspace_member_role(workspace_id) IN ('owner', 'admin'));

-- Questions: same as forms
CREATE POLICY "questions_select_member" ON public.questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_id AND public.is_workspace_member(f.workspace_id)));
CREATE POLICY "questions_write_editor"  ON public.questions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_id AND public.workspace_member_role(f.workspace_id) IN ('owner','admin','editor')));

-- Responses: workspace members can read; public insert via API (enforced at API layer)
CREATE POLICY "responses_select_member" ON public.responses FOR SELECT USING (public.is_workspace_member(workspace_id));
-- Public response submission handled by service role key in API

-- Templates: everyone can read
CREATE POLICY "templates_select_all" ON public.templates FOR SELECT TO PUBLIC USING (TRUE);

-- Workspace usage: members can read
CREATE POLICY "usage_select_member" ON public.workspace_usage FOR SELECT USING (public.is_workspace_member(workspace_id));
