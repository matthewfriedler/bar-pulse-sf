REVOKE ALL ON FUNCTION public.refresh_bar_baselines() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_bar_baselines() TO service_role;

REVOKE ALL ON FUNCTION public.enforce_reading_source() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_approved_staff(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved_staff(uuid, text) TO authenticated, service_role;