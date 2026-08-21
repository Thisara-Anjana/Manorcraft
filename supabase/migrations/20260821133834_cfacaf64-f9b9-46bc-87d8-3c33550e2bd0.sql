
-- 1. Richer new-user handler: stores contact + location details and creates a
--    pending technician profile when someone applies as a professional.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role public.app_role;
  v_district uuid;
  v_city uuid;
begin
  v_role := case upper(coalesce(new.raw_user_meta_data->>'role',''))
              when 'TECHNICIAN' then 'TECHNICIAN'::public.app_role
              else 'CUSTOMER'::public.app_role
            end;

  begin
    v_district := nullif(new.raw_user_meta_data->>'district_id','')::uuid;
  exception when others then v_district := null;
  end;
  begin
    v_city := nullif(new.raw_user_meta_data->>'city_id','')::uuid;
  exception when others then v_city := null;
  end;

  insert into public.profiles (id, full_name, email, phone, district_id, city_id, address)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'phone',''), nullif(new.raw_user_meta_data->>'phone_number','')),
    v_district,
    v_city,
    nullif(new.raw_user_meta_data->>'address','')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, v_role)
  on conflict do nothing;

  if v_role = 'TECHNICIAN' then
    insert into public.technician_profiles (
      profile_id, full_name, specialization, experience_years, bio,
      verification_status, availability
    )
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
      coalesce(nullif(new.raw_user_meta_data->>'specialization',''), 'General'),
      coalesce((nullif(new.raw_user_meta_data->>'experience_years',''))::int, 0),
      coalesce(new.raw_user_meta_data->>'bio',''),
      'PENDING',
      false
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$function$;

-- 2. Demo accounts: profiles, roles and technician record.
with u as (
  select id, email from auth.users
  where email in ('demo.customer@manorcraft.lk','demo.technician@manorcraft.lk','demo.admin@manorcraft.lk')
)
update public.profiles p set
  full_name = case u.email
    when 'demo.customer@manorcraft.lk' then 'Nimal Perera'
    when 'demo.technician@manorcraft.lk' then 'John Perera'
    else 'Manorcraft Administrator' end,
  phone = case u.email
    when 'demo.customer@manorcraft.lk' then '+94 77 100 1001'
    when 'demo.technician@manorcraft.lk' then '+94 77 200 2002'
    else '+94 11 300 3003' end,
  district_id = case when u.email = 'demo.admin@manorcraft.lk' then p.district_id
    else (select id from public.districts where name = 'Colombo' limit 1) end,
  city_id = case u.email
    when 'demo.customer@manorcraft.lk' then (select id from public.cities where name='Nugegoda' limit 1)
    when 'demo.technician@manorcraft.lk' then (select id from public.cities where name='Rajagiriya' limit 1)
    else p.city_id end,
  address = case u.email
    when 'demo.customer@manorcraft.lk' then '24 Old Kesbewa Road, Nugegoda'
    when 'demo.technician@manorcraft.lk' then '8 Kotte Road, Rajagiriya'
    else 'Manorcraft HQ, Colombo 03' end
from u where p.id = u.id;

delete from public.user_roles ur
using auth.users au
where ur.user_id = au.id
  and au.email in ('demo.customer@manorcraft.lk','demo.technician@manorcraft.lk','demo.admin@manorcraft.lk');

insert into public.user_roles (user_id, role)
select au.id,
  case au.email
    when 'demo.customer@manorcraft.lk' then 'CUSTOMER'::public.app_role
    when 'demo.technician@manorcraft.lk' then 'TECHNICIAN'::public.app_role
    else 'ADMIN'::public.app_role
  end
from auth.users au
where au.email in ('demo.customer@manorcraft.lk','demo.technician@manorcraft.lk','demo.admin@manorcraft.lk');

insert into public.technician_profiles (
  profile_id, full_name, specialization, experience_years, rating, completed_jobs,
  availability, verification_status, bio, service_radius_km
)
select au.id, 'John Perera', 'Electrical', 7, 4.9, 128, true, 'VERIFIED',
  'Certified electrician serving Colombo with same-day diagnostics and rewiring.', 30
from auth.users au
where au.email = 'demo.technician@manorcraft.lk'
on conflict (profile_id) do update set
  full_name = excluded.full_name,
  specialization = excluded.specialization,
  experience_years = excluded.experience_years,
  rating = excluded.rating,
  completed_jobs = excluded.completed_jobs,
  availability = true,
  verification_status = 'VERIFIED',
  bio = excluded.bio;
