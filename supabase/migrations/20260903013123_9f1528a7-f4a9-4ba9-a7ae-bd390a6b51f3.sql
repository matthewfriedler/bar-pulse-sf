CREATE TABLE public.bar_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id text NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accuracy_meters double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.bar_checkins TO authenticated;
GRANT SELECT ON public.bar_checkins TO anon;
GRANT ALL ON public.bar_checkins TO service_role;

ALTER TABLE public.bar_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY bar_checkins_public_read ON public.bar_checkins FOR SELECT USING (true);
CREATE POLICY bar_checkins_insert_own ON public.bar_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX bar_checkins_bar_created_idx ON public.bar_checkins (bar_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.bar_checkins;