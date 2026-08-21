create or replace view public.service_reviews as
select
  r.id as review_id,
  s.id as service_id,
  s.slug as service_slug,
  r.rating,
  r.comment,
  r.created_at,
  coalesce(split_part(p.full_name, ' ', 1), 'Manorcraft client') as reviewer_name
from public.reviews r
join public.bookings b on b.id = r.booking_id
join public.services s on s.id = b.service_id
left join public.profiles p on p.id = r.customer_id;

create or replace view public.public_technicians as
select
  tp.profile_id,
  p.full_name,
  tp.specialization,
  tp.rating,
  tp.completed_jobs,
  tp.experience_years,
  tp.availability,
  d.name as district_name
from public.technician_profiles tp
join public.profiles p on p.id = tp.profile_id
left join public.districts d on d.id = p.district_id
where tp.verification_status = 'VERIFIED';

grant select on public.service_reviews to anon, authenticated;
grant select on public.public_technicians to anon, authenticated;