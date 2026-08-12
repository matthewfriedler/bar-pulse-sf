CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.bars (
  id text PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL,
  neighborhood text NOT NULL,
  vibe text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL
);
GRANT SELECT ON public.bars TO anon;
GRANT SELECT ON public.bars TO authenticated;
GRANT ALL ON public.bars TO service_role;
ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bars_public_read" ON public.bars FOR SELECT USING (true);

CREATE TABLE public.bar_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id text NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capacity integer NOT NULL CHECK (capacity >= 0 AND capacity <= 100),
  wait_minutes integer NOT NULL CHECK (wait_minutes >= 0 AND wait_minutes <= 240),
  vibe_note text,
  is_owner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bar_updates_bar_created_idx ON public.bar_updates (bar_id, created_at DESC);
GRANT SELECT ON public.bar_updates TO anon;
GRANT SELECT, INSERT ON public.bar_updates TO authenticated;
GRANT ALL ON public.bar_updates TO service_role;
ALTER TABLE public.bar_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bar_updates_public_read" ON public.bar_updates FOR SELECT USING (true);
CREATE POLICY "bar_updates_insert_own" ON public.bar_updates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.bar_updates;

INSERT INTO public.bars (id, name, address, neighborhood, vibe, lat, lng) VALUES
('horseshoe-tavern','Horseshoe Tavern','2024 Chestnut St','Marina','dive bar',37.80055,-122.43690),
('bar-darling','Bar Darling','2299 Chestnut St','Marina','cocktail lounge',37.80040,-122.44050),
('the-tipsy-pig','The Tipsy Pig','2231 Chestnut St','Marina','neighborhood pub',37.80035,-122.43920),
('delarosa','Delarosa','2175 Chestnut St','Marina','wine bar',37.80030,-122.43810),
('the-dorian','The Dorian','2001 Chestnut St','Marina','cocktail lounge',37.80062,-122.43620),
('rendezvous','Rendezvous','2323 Chestnut St','Marina','late night',37.80045,-122.44110),
('sullys-marina-lounge','Sully''s Marina Lounge','2138 Chestnut St','Marina','sports bar',37.80025,-122.43770),
('monaghans-bar','Monaghan''s Bar','3259 Pierce St','Marina','neighborhood pub',37.79980,-122.43700),
('the-patio','The Patio','2436 Lombard St','Marina','tiki/tropical',37.79950,-122.44020),
('balboa-cafe','Balboa Cafe','3199 Fillmore St','Cow Hollow','neighborhood pub',37.79755,-122.43600),
('the-brixton','The Brixton','2140 Union St','Cow Hollow','sports bar',37.79750,-122.43180),
('black-horse-london-pub','Black Horse London Pub','1514 Union St','Cow Hollow','dive bar',37.79790,-122.42430),
('west-coast-wine-cheese','West Coast Wine & Cheese','2165 Union St','Cow Hollow','wine bar',37.79742,-122.43225),
('palm-house','Palm House','2032 Union St','Cow Hollow','tiki/tropical',37.79772,-122.43000),
('wilder','Wilder','2201 Union St','Cow Hollow','cocktail lounge',37.79740,-122.43270);