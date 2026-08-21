insert into public.user_roles (user_id, role)
select u.id, 'CUSTOMER'::public.app_role
from auth.users u
where not exists (select 1 from public.user_roles r where r.user_id = u.id)
on conflict do nothing;

create policy "Users create own notifications"
on public.notifications for insert to authenticated
with check (user_id = auth.uid());