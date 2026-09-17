REVOKE EXECUTE ON FUNCTION public.is_approved_staff(uuid, text) FROM authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta_username text;
  base_username text;
  candidate text;
  n int := 0;
  confirmed boolean;
BEGIN
  meta_username := NULLIF(NEW.raw_user_meta_data->>'username', '');
  confirmed := meta_username IS NOT NULL;
  base_username := lower(regexp_replace(
    COALESCE(meta_username, split_part(COALESCE(NEW.email, 'patron'), '@', 1)),
    '[^a-z0-9_]', '', 'g'));
  IF length(base_username) < 3 THEN
    base_username := 'patron';
  END IF;
  base_username := left(base_username, 16);
  candidate := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles p WHERE p.username = candidate) LOOP
    n := n + 1;
    candidate := base_username || n::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, username_confirmed, avatar_url)
  VALUES (
    NEW.id,
    candidate,
    confirmed,
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- The first account to ever sign up becomes the admin who reviews staff claims.
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;