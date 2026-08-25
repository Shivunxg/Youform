-- ============================================================
-- KTPCL SIMMS — Migration: Proposals
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Auto-incrementing proposal counter (persists across years)
CREATE SEQUENCE IF NOT EXISTS public.proposal_number_seq START 1;

-- Proposals table
CREATE TABLE IF NOT EXISTS public.proposals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_number  text NOT NULL UNIQUE,
  job_card_id      uuid REFERENCES public.job_cards(id) ON DELETE SET NULL,
  station_id       uuid REFERENCES public.hierarchy_nodes(id) ON DELETE SET NULL,
  client_name      text NOT NULL,              -- substation name at time of creation
  title            text NOT NULL,
  scope_of_work    text,
  items            jsonb NOT NULL DEFAULT '[]',  -- [{description,qty,unit,rate,amount}]
  terms            text,
  subtotal         numeric(14,2) NOT NULL DEFAULT 0,
  tax_percent      numeric(5,2)  NOT NULL DEFAULT 18,
  tax_amount       numeric(14,2) NOT NULL DEFAULT 0,
  total            numeric(14,2) NOT NULL DEFAULT 0,
  validity_days    int           NOT NULL DEFAULT 30,
  status           text          NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  created_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

-- Auto-generate proposal number: SC-YYYY-00001
CREATE OR REPLACE FUNCTION public.set_proposal_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.proposal_number IS NULL OR NEW.proposal_number = '' THEN
    NEW.proposal_number :=
      'SC-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.proposal_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proposal_number ON public.proposals;
CREATE TRIGGER trg_proposal_number
  BEFORE INSERT ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_proposal_number();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_proposal_updated_at ON public.proposals;
CREATE TRIGGER trg_proposal_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_proposals" ON public.proposals
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'spectrum_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'spectrum_admin'));

CREATE POLICY "ae_read_own_station_proposals" ON public.proposals
  FOR SELECT TO authenticated
  USING (
    station_id IN (
      SELECT station_id FROM public.profiles WHERE id = auth.uid()
    )
  );
