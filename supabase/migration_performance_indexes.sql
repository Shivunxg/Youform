-- ============================================================
-- KTPCL SIMMS — Migration: Performance Indexes
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- job_cards: most-queried columns
CREATE INDEX IF NOT EXISTS idx_job_cards_status     ON public.job_cards(current_status);
CREATE INDEX IF NOT EXISTS idx_job_cards_created_at ON public.job_cards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_cards_station_id ON public.job_cards(station_id);

-- status_history: always filtered by job_card_id
CREATE INDEX IF NOT EXISTS idx_status_history_job_card_id ON public.status_history(job_card_id);

-- job_card_engineers: always filtered by job_card_id
CREATE INDEX IF NOT EXISTS idx_jce_job_card_id ON public.job_card_engineers(job_card_id);

-- work_acknowledgements: always filtered by job_card_id
CREATE INDEX IF NOT EXISTS idx_ack_job_card_id ON public.work_acknowledgements(job_card_id);

-- proposals
CREATE INDEX IF NOT EXISTS idx_proposals_station_id ON public.proposals(station_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status     ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON public.proposals(created_at DESC);

-- hierarchy_nodes: frequently filtered by level and parent
CREATE INDEX IF NOT EXISTS idx_hierarchy_nodes_level     ON public.hierarchy_nodes(level);
CREATE INDEX IF NOT EXISTS idx_hierarchy_nodes_parent_id ON public.hierarchy_nodes(parent_id);

-- notifications_queue
CREATE INDEX IF NOT EXISTS idx_notifications_queue_created_at ON public.notifications_queue(created_at DESC);
