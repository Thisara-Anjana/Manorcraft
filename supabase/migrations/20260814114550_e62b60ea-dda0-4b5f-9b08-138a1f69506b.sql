-- Roles
create type public.app_role as enum ('admin','technician','customer');
create type public.job_category as enum ('Plumbing','Electrical','Masonry','AC Repair');
create type public.job_status as enum ('Pending','Assigned','In Progress','Completed');
create type public.tech_status as enum ('Available','On Job','Off Duty');

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users can view own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Branches
create table public.branches (
  branch_id uuid primary key default gen_random_uuid(),
  district_name text not null,
  manager_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.branches to anon;
grant select, insert, update, delete on public.branches to authenticated;
grant all on public.branches to service_role;
alter table public.branches enable row level security;
create policy "Branches are publicly viewable" on public.branches for select using (true);
create policy "Admins manage branches" on public.branches for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger update_branches_updated_at before update on public.branches for each row execute function public.update_updated_at_column();

-- Customers
create table public.customers (
  customer_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "Customers view own profile" on public.customers for select to authenticated using (auth.uid() = customer_id or public.has_role(auth.uid(),'admin'));
create policy "Customers insert own profile" on public.customers for insert to authenticated with check (auth.uid() = customer_id);
create policy "Customers update own profile" on public.customers for update to authenticated using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
create policy "Admins delete customers" on public.customers for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger update_customers_updated_at before update on public.customers for each row execute function public.update_updated_at_column();

-- Technicians
create table public.technicians (
  technician_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  primary_skill job_category not null,
  current_status tech_status not null default 'Available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.technicians to authenticated;
grant all on public.technicians to service_role;
alter table public.technicians enable row level security;
create policy "Signed-in users view technicians" on public.technicians for select to authenticated using (true);
create policy "Technicians update own record" on public.technicians for update to authenticated using (auth.uid() = technician_id or public.has_role(auth.uid(),'admin')) with check (auth.uid() = technician_id or public.has_role(auth.uid(),'admin'));
create policy "Admins insert technicians" on public.technicians for insert to authenticated with check (auth.uid() = technician_id or public.has_role(auth.uid(),'admin'));
create policy "Admins delete technicians" on public.technicians for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger update_technicians_updated_at before update on public.technicians for each row execute function public.update_updated_at_column();

-- Job tickets
create table public.job_tickets (
  ticket_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  technician_id uuid references auth.users(id) on delete set null,
  district text not null,
  address text,
  job_category job_category not null,
  job_status job_status not null default 'Pending',
  description text not null,
  scheduled_date date,
  time_slot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.job_tickets to authenticated;
grant all on public.job_tickets to service_role;
alter table public.job_tickets enable row level security;
create policy "Customers view own tickets" on public.job_tickets for select to authenticated using (auth.uid() = customer_id or auth.uid() = technician_id or public.has_role(auth.uid(),'admin'));
create policy "Customers create own tickets" on public.job_tickets for insert to authenticated with check (auth.uid() = customer_id);
create policy "Owners and techs update tickets" on public.job_tickets for update to authenticated using (auth.uid() = customer_id or auth.uid() = technician_id or public.has_role(auth.uid(),'admin')) with check (auth.uid() = customer_id or auth.uid() = technician_id or public.has_role(auth.uid(),'admin'));
create policy "Admins delete tickets" on public.job_tickets for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger update_job_tickets_updated_at before update on public.job_tickets for each row execute function public.update_updated_at_column();

-- Auto-create customer profile + role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (customer_id, full_name, phone_number)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'phone_number')
  on conflict (customer_id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.branches (district_name, manager_name) values
  ('Colombo','Nuwan Perera'),
  ('Kandy','Dilani Rajapaksa'),
  ('Anuradhapura','Suresh Bandara');