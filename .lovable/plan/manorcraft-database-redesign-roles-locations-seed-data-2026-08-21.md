# Manorcraft — Database Redesign, Roles, Locations & Seed Data

A full replacement of the current backend structure with the new production-ready schema, plus the frontend rewiring needed so nothing points at the old tables.

## What exists today (inspected)

Current tables: `branches`, `customers`, `technicians`, `job_tickets`, `job_tickets_history`, `reviews`, `services`, `user_roles`, `brand_settings`.
Frontend code that talks to them: `src/lib/dispatch.functions.ts`, `portal.functions.ts`, `technician.functions.ts`, `history.functions.ts`, `roles.functions.ts`, `services.server.ts`, `auth-routing.ts`, `src/hooks/useBrandLogo.ts`, `src/routes/_authenticated/book.tsx`, `admin.settings.tsx`, plus the admin/technician/customer dashboards and `SmartRoutingMap`.

`brand_settings` + the `brand_assets` storage bucket are unrelated to this redesign and will be kept as-is (the logo feature keeps working).

## One deliberate deviation from the spec

The spec puts `role` on `profiles`. Storing a role on a user-editable profile row is a privilege-escalation risk (a customer can update their own profile row and become ADMIN). Instead:

- `profiles` holds identity/contact/location only — no role column.
- A separate `user_roles` table holds `(user_id, role)` with an `app_role` enum (`ADMIN`, `CUSTOMER`, `TECHNICIAN`), writable only by admins.
- A `has_role(user_id, role)` security-definer function drives every RLS policy.

Everything else follows the requested structure exactly.

## New schema

```text
auth.users → profiles → user_roles
                     └→ technician_profiles → technician_availability
districts → cities
profiles + services + districts + cities → bookings → booking_status_history
                                                   └→ reviews
profiles → notifications
```

- `districts` — all 25 districts with province.
- `cities` — cities/towns/suburbs per district, verified against the correct district before insert (the request's example list has a few cross-district entries, e.g. Kalmunai and Weligama, which will be assigned to their true district and not duplicated).
- `services` — Plumbing, Electrical, Masonry, AC Repair with descriptions, starting price, duration, image.
- `bookings` — `booking_number` (MC-####), customer/technician/service/district/city refs, address, lat/lng, schedule, prices, `booking_status` enum (PENDING → … → COMPLETED / CANCELLED).
- `booking_status_history` — written automatically by a trigger on every status change.
- `reviews` — one per booking, completed bookings only, 1–5 rating.
- `notifications`, `technician_availability` as specified.
- Indexes on every column listed in section 22; FKs, unique constraints, check constraints, `updated_at` triggers.

## RLS

Admin full management access; customers scoped to `auth.uid()` for their own profile, bookings, reviews and notifications; technicians scoped to their assigned bookings, own profile, availability and ratings. `districts`, `cities` and active `services` are publicly readable so the location selector and catalogue work signed-out.

## Seed data

- Auth users created through the Auth admin API (never passwords in tables): `admin@manorcraft.lk`, `customer1–3@manorcraft.lk`, `technician1–4@manorcraft.lk`, all with a shared dev password I will give you.
- Profiles with the named Sri Lankan people/districts/areas, technician specialisations, availability rows.
- 15+ bookings spread across all statuses, districts and services, with full status history.
- 10+ reviews (ratings 3–5) with technician ratings derived from them, and notifications matching the examples.

## Frontend rewiring

- Regenerate Supabase types, then rewrite the data layer: `bookings.functions.ts`, `locations.functions.ts`, `profiles.functions.ts`, `technician.functions.ts`, `admin.functions.ts`, replacing `job_tickets`/`customers`/`technicians`/`user_roles` usage everywhere.
- Cascading **District → City / Area** selector component (city dropdown disabled until a district is chosen, cities fetched filtered by `district_id`, city cleared on district change) used in booking and profile forms.
- Customer dashboard: own upcoming/active/history bookings + notifications + profile.
- Technician dashboard: assigned jobs, accept/reject, status updates, earnings, ratings, availability.
- Admin dashboard: real counts (customers, technicians, bookings, active/completed/cancelled, revenue) and charts (by day, district, service, revenue, technician performance) computed from the database — no hard-coded numbers.
- Booking lifecycle status mapping, timeline, map view and dispatch board updated to the new status enum.
- Delete the obsolete tables only after the code no longer references them, then build + lint and fix everything.

## Sequencing

1. Create new schema + RLS + indexes (migration 1).
2. Seed locations, services (migration 2) and auth users + dummy data.
3. Rewrite frontend data layer, components and dashboards.
4. Drop obsolete tables (`job_tickets`, `job_tickets_history`, `customers`, `technicians`, `branches`, old `services`/`reviews`) once nothing references them (migration 3).
5. Build, lint, and walk the 24-point validation list in the browser.

This is a large change and will run across several steps; I'll keep the app compiling throughout.
