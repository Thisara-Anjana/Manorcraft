-- ============ 1. TEAR DOWN OLD STRUCTURE ============
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.reviews cascade;
drop table if exists public.job_tickets_history cascade;
drop table if exists public.job_tickets cascade;
drop table if exists public.customers cascade;
drop table if exists public.technicians cascade;
drop table if exists public.branches cascade;
drop table if exists public.services cascade;
drop table if exists public.user_roles cascade;
drop sequence if exists public.booking_code_seq cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.has_role(uuid, public.app_role) cascade;
drop function if exists public.log_job_status_change() cascade;
drop type if exists public.app_role cascade;
drop type if exists public.job_status cascade;
drop type if exists public.job_category cascade;
drop type if exists public.tech_status cascade;

-- ============ 2. ENUMS ============
create type public.app_role as enum ('ADMIN', 'CUSTOMER', 'TECHNICIAN');
create type public.booking_status as enum (
  'PENDING','CONFIRMED','TECHNICIAN_ASSIGNED','TECHNICIAN_ACCEPTED',
  'ON_THE_WAY','SERVICE_STARTED','COMPLETED','CANCELLED'
);

-- ============ 3. LOCATIONS ============
create table public.districts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  province text not null,
  created_at timestamptz not null default now()
);
grant select on public.districts to anon, authenticated;
grant all on public.districts to service_role;
alter table public.districts enable row level security;

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references public.districts(id) on delete cascade,
  name text not null,
  postal_code text,
  created_at timestamptz not null default now(),
  unique (district_id, name)
);
grant select on public.cities to anon, authenticated;
grant all on public.cities to service_role;
alter table public.cities enable row level security;

-- ============ 4. PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  avatar_url text,
  district_id uuid references public.districts(id) on delete set null,
  city_id uuid references public.cities(id) on delete set null,
  address text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, anon, service_role;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'ADMIN')
$$;
grant execute on function public.is_admin() to authenticated, anon, service_role;

-- ============ 5. SERVICES ============
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null,
  starting_price numeric not null default 0,
  hourly_rate numeric not null default 0,
  estimated_duration integer not null default 60,
  image_url text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.services to anon, authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;

-- ============ 6. TECHNICIAN PROFILES ============
create table public.technician_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  specialization text not null,
  experience_years integer not null default 0,
  rating numeric not null default 0,
  completed_jobs integer not null default 0,
  availability boolean not null default true,
  verification_status text not null default 'PENDING'
    check (verification_status in ('PENDING','VERIFIED','REJECTED')),
  bio text not null default '',
  service_radius_km numeric not null default 25,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.technician_profiles to anon, authenticated;
grant insert, update on public.technician_profiles to authenticated;
grant all on public.technician_profiles to service_role;
alter table public.technician_profiles enable row level security;

create table public.technician_availability (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null default '08:00',
  end_time time not null default '17:00',
  available boolean not null default true,
  created_at timestamptz not null default now(),
  unique (technician_id, day_of_week)
);
grant select, insert, update, delete on public.technician_availability to authenticated;
grant all on public.technician_availability to service_role;
alter table public.technician_availability enable row level security;

-- ============ 7. BOOKINGS ============
create sequence public.booking_number_seq start 1001;
grant usage on sequence public.booking_number_seq to authenticated, service_role;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number text not null unique default ('MC-' || nextval('public.booking_number_seq')),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  technician_id uuid references public.profiles(id) on delete set null,
  service_id uuid not null references public.services(id) on delete restrict,
  district_id uuid not null references public.districts(id) on delete restrict,
  city_id uuid not null references public.cities(id) on delete restrict,
  address text not null,
  latitude numeric,
  longitude numeric,
  scheduled_date date not null,
  scheduled_time time not null default '09:00',
  problem_description text not null default '',
  estimated_price numeric not null default 0,
  final_price numeric,
  status public.booking_status not null default 'PENDING',
  cancellation_reason text,
  cancelled_at timestamptz,
  reschedule_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  status public.booking_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
grant select on public.booking_status_history to authenticated;
grant all on public.booking_status_history to service_role;
alter table public.booking_status_history enable row level security;

-- ============ 8. REVIEWS ============
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  technician_id uuid references public.profiles(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;

-- ============ 9. NOTIFICATIONS ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null default '',
  type text not null default 'INFO',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

-- ============ 10. INDEXES ============
create index idx_cities_district on public.cities(district_id);
create index idx_user_roles_user on public.user_roles(user_id);
create index idx_user_roles_role on public.user_roles(role);
create index idx_profiles_district on public.profiles(district_id);
create index idx_profiles_city on public.profiles(city_id);
create index idx_bookings_customer on public.bookings(customer_id);
create index idx_bookings_technician on public.bookings(technician_id);
create index idx_bookings_service on public.bookings(service_id);
create index idx_bookings_district on public.bookings(district_id);
create index idx_bookings_city on public.bookings(city_id);
create index idx_bookings_status on public.bookings(status);
create index idx_bookings_scheduled_date on public.bookings(scheduled_date);
create index idx_notifications_user on public.notifications(user_id);
create index idx_bsh_booking on public.booking_status_history(booking_id);
create index idx_reviews_technician on public.reviews(technician_id);
create index idx_tech_avail_tech on public.technician_availability(technician_id);

-- ============ 11. TRIGGERS ============
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.update_updated_at_column();
create trigger trg_services_updated before update on public.services
  for each row execute function public.update_updated_at_column();
create trigger trg_tech_profiles_updated before update on public.technician_profiles
  for each row execute function public.update_updated_at_column();
create trigger trg_bookings_updated before update on public.bookings
  for each row execute function public.update_updated_at_column();
create trigger trg_reviews_updated before update on public.reviews
  for each row execute function public.update_updated_at_column();

create or replace function public.log_booking_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_status_history (booking_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.booking_status_history (booking_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;
create trigger trg_bookings_status_history
  after insert or update on public.bookings
  for each row execute function public.log_booking_status_change();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.email,
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (
    new.id,
    case upper(coalesce(new.raw_user_meta_data->>'role',''))
      when 'TECHNICIAN' then 'TECHNICIAN'::public.app_role
      else 'CUSTOMER'::public.app_role
    end
  )
  on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ 12. RLS POLICIES ============
-- locations
create policy "Districts are public" on public.districts for select to anon, authenticated using (true);
create policy "Admins manage districts" on public.districts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Cities are public" on public.cities for select to anon, authenticated using (true);
create policy "Admins manage cities" on public.cities for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- profiles
create policy "Users view own profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "Technicians view customers of assigned jobs" on public.profiles for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.technician_id = auth.uid() and b.customer_id = profiles.id
  ));
create policy "Customers view assigned technician profile" on public.profiles for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.customer_id = auth.uid() and b.technician_id = profiles.id
  ));
create policy "Users insert own profile" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "Users update own profile" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- user_roles (writes are service_role / admin only)
create policy "Users view own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- services
create policy "Active services are public" on public.services for select to anon, authenticated
  using (active or public.is_admin());
create policy "Admins manage services" on public.services for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- technician profiles
create policy "Technician profiles are viewable" on public.technician_profiles
  for select to anon, authenticated using (true);
create policy "Technicians insert own tech profile" on public.technician_profiles
  for insert to authenticated with check (profile_id = auth.uid() or public.is_admin());
create policy "Technicians update own tech profile" on public.technician_profiles
  for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

-- availability
create policy "Availability viewable by signed-in users" on public.technician_availability
  for select to authenticated using (true);
create policy "Technicians manage own availability" on public.technician_availability
  for all to authenticated
  using (technician_id = auth.uid() or public.is_admin())
  with check (technician_id = auth.uid() or public.is_admin());

-- bookings
create policy "Booking parties can view" on public.bookings for select to authenticated
  using (customer_id = auth.uid() or technician_id = auth.uid() or public.is_admin());
create policy "Customers create own bookings" on public.bookings for insert to authenticated
  with check (customer_id = auth.uid() and public.has_role(auth.uid(), 'CUSTOMER'));
create policy "Booking parties can update" on public.bookings for update to authenticated
  using (customer_id = auth.uid() or technician_id = auth.uid() or public.is_admin())
  with check (customer_id = auth.uid() or technician_id = auth.uid() or public.is_admin());

-- history
create policy "History visible to booking parties" on public.booking_status_history
  for select to authenticated using (exists (
    select 1 from public.bookings b
    where b.id = booking_status_history.booking_id
      and (b.customer_id = auth.uid() or b.technician_id = auth.uid() or public.is_admin())
  ));

-- reviews
create policy "Reviews are public" on public.reviews for select to anon, authenticated using (true);
create policy "Customers review own completed bookings" on public.reviews for insert to authenticated
  with check (customer_id = auth.uid() and exists (
    select 1 from public.bookings b
    where b.id = reviews.booking_id and b.customer_id = auth.uid() and b.status = 'COMPLETED'
  ));
create policy "Customers update own reviews" on public.reviews for update to authenticated
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "Customers or admins delete reviews" on public.reviews for delete to authenticated
  using (customer_id = auth.uid() or public.is_admin());

-- notifications
create policy "Users view own notifications" on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "Users update own notifications" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());