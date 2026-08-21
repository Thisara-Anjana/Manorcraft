drop view if exists public.service_reviews;
drop view if exists public.public_technicians;

alter table public.reviews add column if not exists service_id uuid references public.services(id) on delete set null;
alter table public.reviews add column if not exists reviewer_name text not null default 'Manorcraft client';

update public.reviews r
set service_id = b.service_id,
    reviewer_name = coalesce(split_part(p.full_name, ' ', 1), 'Manorcraft client')
from public.bookings b
left join public.profiles p on p.id = b.customer_id
where b.id = r.booking_id;

create or replace function public.fill_review_denorm()
returns trigger language plpgsql set search_path = public as $$
begin
  select b.service_id into new.service_id from public.bookings b where b.id = new.booking_id;
  select coalesce(split_part(p.full_name, ' ', 1), 'Manorcraft client')
    into new.reviewer_name from public.profiles p where p.id = new.customer_id;
  return new;
end;
$$;
revoke execute on function public.fill_review_denorm() from anon, authenticated, public;
drop trigger if exists trg_reviews_denorm on public.reviews;
create trigger trg_reviews_denorm before insert on public.reviews
  for each row execute function public.fill_review_denorm();

alter table public.technician_profiles add column if not exists full_name text not null default 'Technician';
update public.technician_profiles tp
set full_name = p.full_name
from public.profiles p where p.id = tp.profile_id;

create or replace function public.sync_technician_name()
returns trigger language plpgsql set search_path = public as $$
begin
  update public.technician_profiles set full_name = new.full_name where profile_id = new.id;
  return new;
end;
$$;
revoke execute on function public.sync_technician_name() from anon, authenticated, public;
drop trigger if exists trg_profiles_sync_tech_name on public.profiles;
create trigger trg_profiles_sync_tech_name after update of full_name on public.profiles
  for each row execute function public.sync_technician_name();

create index if not exists idx_reviews_service on public.reviews(service_id);

create view public.service_reviews with (security_invoker = on) as
select r.id as review_id, r.service_id, s.slug as service_slug,
       r.rating, r.comment, r.created_at, r.reviewer_name
from public.reviews r
join public.services s on s.id = r.service_id;

create view public.public_technicians with (security_invoker = on) as
select tp.profile_id, tp.full_name, tp.specialization, tp.rating,
       tp.completed_jobs, tp.experience_years, tp.availability
from public.technician_profiles tp
where tp.verification_status = 'VERIFIED';

grant select on public.service_reviews to anon, authenticated;
grant select on public.public_technicians to anon, authenticated;