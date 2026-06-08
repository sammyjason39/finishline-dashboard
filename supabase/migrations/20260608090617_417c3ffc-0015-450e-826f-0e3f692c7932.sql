REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.are_connected(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.are_connected(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_invite(text) TO authenticated;