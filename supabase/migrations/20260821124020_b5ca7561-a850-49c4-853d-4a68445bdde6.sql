revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.is_admin() from anon, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.log_booking_status_change() from anon, authenticated, public;
revoke execute on function public.update_updated_at_column() from anon, authenticated, public;