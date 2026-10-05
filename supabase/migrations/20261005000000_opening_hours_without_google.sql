-- Replace the Google Places dependency for open/closed status.
--
-- Previously open_now came from Google Places via a server function. That
-- required an API key, a paid quota, and an external request. For 15 fixed
-- bars the hours are effectively static, so we store them in the database and
-- compute open_now in SQL instead. No API key, no quota, no network call.
--
-- Nothing in the frontend changes: it still reads open_now from
-- bar_place_cache exactly as before.

-- 1. Store each bar's weekly hours -------------------------------------------
-- Shape: {"mon": ["17:00","02:00"], "tue": null, ...}
--   - a null or missing day means closed that day
--   - a close time earlier than the open time means it closes after midnight
ALTER TABLE public.bars
  ADD COLUMN IF NOT EXISTS opening_hours jsonb;

COMMENT ON COLUMN public.bars.opening_hours IS
  'Weekly hours keyed by lowercase 3-letter weekday. Each value is [open, close] in 24h local time, or null when closed. A close time before the open time means the bar closes after midnight.';

-- 2. Is a bar open at a given moment? ----------------------------------------
CREATE OR REPLACE FUNCTION public.is_open_at(hours jsonb, at_ts timestamptz)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  local_ts   timestamp;
  day_keys   text[] := ARRAY['sun','mon','tue','wed','thu','fri','sat'];
  today_key  text;
  prev_key   text;
  win        jsonb;
  open_t     time;
  close_t    time;
  now_t      time;
BEGIN
  IF hours IS NULL THEN
    RETURN NULL;              -- unknown, not "closed"
  END IF;

  -- All bars here are in San Francisco.
  local_ts  := at_ts AT TIME ZONE 'America/Los_Angeles';
  now_t     := local_ts::time;
  today_key := day_keys[EXTRACT(DOW FROM local_ts)::int + 1];
  prev_key  := day_keys[((EXTRACT(DOW FROM local_ts)::int + 6) % 7) + 1];

  -- Today's window.
  win := hours -> today_key;
  IF win IS NOT NULL AND jsonb_typeof(win) = 'array' THEN
    open_t  := (win ->> 0)::time;
    close_t := (win ->> 1)::time;
    IF close_t > open_t THEN
      IF now_t >= open_t AND now_t < close_t THEN RETURN true; END IF;
    ELSE
      -- Closes after midnight: open from open_t until end of day.
      IF now_t >= open_t THEN RETURN true; END IF;
    END IF;
  END IF;

  -- Yesterday's window may still be running (e.g. 17:00-02:00 and it's 01:00).
  win := hours -> prev_key;
  IF win IS NOT NULL AND jsonb_typeof(win) = 'array' THEN
    open_t  := (win ->> 0)::time;
    close_t := (win ->> 1)::time;
    IF close_t <= open_t AND now_t < close_t THEN RETURN true; END IF;
  END IF;

  RETURN false;
END;
$$;

-- 3. Refresh open_now for every bar ------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_open_now()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  touched integer;
BEGIN
  INSERT INTO public.bar_place_cache (bar_id, open_now, hours, fetched_at)
  SELECT b.id,
         public.is_open_at(b.opening_hours, now()),
         b.opening_hours,
         now()
  FROM public.bars b
  ON CONFLICT (bar_id) DO UPDATE
    SET open_now   = EXCLUDED.open_now,
        hours      = EXCLUDED.hours,
        fetched_at = EXCLUDED.fetched_at;

  SELECT count(*) INTO touched FROM public.bars;
  RETURN touched;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_open_now() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_open_now() TO service_role;

-- 4. Read open/closed live, without waiting on a refresh ---------------------
-- The frontend keeps reading bar_place_cache, but this view lets anything that
-- wants a guaranteed-current answer compute it on the spot.
CREATE OR REPLACE VIEW public.bar_open_status AS
SELECT b.id AS bar_id,
       public.is_open_at(b.opening_hours, now()) AS open_now,
       b.opening_hours
FROM public.bars b;

GRANT SELECT ON public.bar_open_status TO anon, authenticated;

-- 5. Seed hours --------------------------------------------------------------
-- PLACEHOLDER VALUES. These are plausible neighborhood-bar hours, NOT verified
-- against each venue. Check each bar and correct before relying on this in
-- production: a wrong value here shows a bar as closed when it is open.
UPDATE public.bars SET opening_hours = '{
  "mon": ["16:00","02:00"], "tue": ["16:00","02:00"], "wed": ["16:00","02:00"],
  "thu": ["16:00","02:00"], "fri": ["14:00","02:00"], "sat": ["12:00","02:00"],
  "sun": ["12:00","00:00"]
}'::jsonb
WHERE opening_hours IS NULL;

-- Wine bars and restaurants that close earlier.
UPDATE public.bars SET opening_hours = '{
  "mon": null, "tue": ["17:00","22:00"], "wed": ["17:00","22:00"],
  "thu": ["17:00","22:00"], "fri": ["16:00","23:00"], "sat": ["15:00","23:00"],
  "sun": ["15:00","21:00"]
}'::jsonb
WHERE id IN ('west-coast-wine-cheese','wilder');

SELECT public.refresh_open_now();
