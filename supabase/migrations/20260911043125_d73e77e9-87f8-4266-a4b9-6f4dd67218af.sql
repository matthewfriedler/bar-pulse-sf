-- Roles ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_read_own" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Staff claims ------------------------------------------------------
CREATE TABLE public.bar_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id text NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bar_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.bar_staff TO authenticated;
GRANT SELECT ON public.bar_staff TO anon;
GRANT ALL ON public.bar_staff TO service_role;
ALTER TABLE public.bar_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bar_staff_public_read_approved" ON public.bar_staff
  FOR SELECT USING (status = 'approved');
CREATE POLICY "bar_staff_read_own" ON public.bar_staff
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bar_staff_admin_read" ON public.bar_staff
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bar_staff_insert_own_pending" ON public.bar_staff
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "bar_staff_admin_update" ON public.bar_staff
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_approved_staff(_user_id uuid, _bar_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bar_staff
    WHERE user_id = _user_id AND bar_id = _bar_id AND status = 'approved'
  )
$$;

-- Reading source ----------------------------------------------------
ALTER TABLE public.bar_updates
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'patron';
ALTER TABLE public.bar_updates
  ADD CONSTRAINT bar_updates_source_check CHECK (source IN ('patron', 'staff', 'correction'));
ALTER TABLE public.bar_updates
  ADD COLUMN IF NOT EXISTS door_count integer;

CREATE OR REPLACE FUNCTION public.enforce_reading_source()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_approved_staff(NEW.user_id, NEW.bar_id) THEN
    NEW.is_owner := false;
    IF NEW.source = 'staff' THEN NEW.source := 'patron'; END IF;
  ELSIF NEW.source = 'staff' THEN
    NEW.is_owner := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bar_updates_enforce_source ON public.bar_updates;
CREATE TRIGGER bar_updates_enforce_source
  BEFORE INSERT ON public.bar_updates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_reading_source();

-- Confirmations -----------------------------------------------------
CREATE TABLE public.bar_reading_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id text NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  update_id uuid REFERENCES public.bar_updates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agrees boolean NOT NULL,
  direction text CHECK (direction IN ('quieter', 'busier')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bar_reading_confirmations_bar_time_idx
  ON public.bar_reading_confirmations (bar_id, created_at DESC);
GRANT SELECT, INSERT ON public.bar_reading_confirmations TO authenticated;
GRANT SELECT ON public.bar_reading_confirmations TO anon;
GRANT ALL ON public.bar_reading_confirmations TO service_role;
ALTER TABLE public.bar_reading_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "confirmations_public_read" ON public.bar_reading_confirmations
  FOR SELECT USING (true);
CREATE POLICY "confirmations_insert_own" ON public.bar_reading_confirmations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Historical baseline ------------------------------------------------
CREATE TABLE public.bar_baselines (
  bar_id text NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  dow smallint NOT NULL CHECK (dow BETWEEN 0 AND 6),
  hour smallint NOT NULL CHECK (hour BETWEEN 0 AND 23),
  avg_capacity numeric NOT NULL,
  avg_wait numeric NOT NULL DEFAULT 0,
  samples integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bar_id, dow, hour)
);
GRANT SELECT ON public.bar_baselines TO anon, authenticated;
GRANT ALL ON public.bar_baselines TO service_role;
ALTER TABLE public.bar_baselines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "baselines_public_read" ON public.bar_baselines FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.refresh_bar_baselines()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  affected integer;
BEGIN
  DELETE FROM public.bar_baselines;
  INSERT INTO public.bar_baselines (bar_id, dow, hour, avg_capacity, avg_wait, samples)
  SELECT
    bar_id,
    EXTRACT(DOW FROM created_at AT TIME ZONE 'America/Los_Angeles')::smallint,
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Los_Angeles')::smallint,
    ROUND(AVG(capacity)::numeric, 1),
    ROUND(AVG(wait_minutes)::numeric, 1),
    COUNT(*)
  FROM public.bar_updates
  GROUP BY 1, 2, 3;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Place cache --------------------------------------------------------
ALTER TABLE public.bars ADD COLUMN IF NOT EXISTS google_place_id text;

CREATE TABLE public.bar_place_cache (
  bar_id text PRIMARY KEY REFERENCES public.bars(id) ON DELETE CASCADE,
  place_id text,
  open_now boolean,
  hours jsonb,
  rating numeric,
  user_rating_count integer,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bar_place_cache TO anon, authenticated;
GRANT ALL ON public.bar_place_cache TO service_role;
ALTER TABLE public.bar_place_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "place_cache_public_read" ON public.bar_place_cache FOR SELECT USING (true);

-- Realtime -----------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.bar_reading_confirmations;