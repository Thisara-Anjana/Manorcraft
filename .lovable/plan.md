# Admin Roles Management Page

Add a new "Admins" page in the Admin dashboard where an admin can see every registered account, view who currently holds the admin role, and grant or revoke admin access.

## What the page shows

- A table of all signed-in user accounts: name, email, phone (when available), signup date, and their roles (Admin / Technician / Customer badges in the existing navy-and-gold styling).
- A search box to filter by name or email.
- Per row: a "Make Admin" button, or "Revoke Admin" when the user already has the role, with a confirmation dialog.
- Your own row is labelled "You" and its revoke button is disabled, so an admin cannot lock themselves out.
- Toast confirmation on success, error toast on failure, table refreshes automatically.

## Navigation

A new "Admins" entry (shield icon) is added to the admin sidebar between Technicians and Settings, at `/admin/admins`.

## Access rules

Only accounts with the admin role can open this page or perform a grant/revoke — the same protection already used on the Dispatch Board. Everyone else sees the restricted-access notice.

## Technical notes

- New `src/lib/roles.functions.ts` with three server functions, all behind `requireSupabaseAuth` and an admin check performed with the caller's own client (`user_roles` read, same `assertAdmin` pattern as `dispatch.functions.ts`):
  - `listUsersWithRoles` — after the admin check, loads `supabaseAdmin` inside the handler to call the Auth Admin API for the account list (email, created_at) and joins it with `user_roles` plus `customers.full_name` / `technicians.full_name`. Returns a plain DTO array; no tokens or password data.
  - `grantAdminRole` / `revokeAdminRole` — validate a uuid with Zod, re-check the caller is admin, then insert/delete the `('admin')` row in `user_roles` via `supabaseAdmin`. `user_roles` has no write policies by design, so writes must go through the privileged client after the role check. Revoke refuses when the target is the caller.
- New route `src/routes/_authenticated/admin.admins.tsx`, using TanStack Query (`useQuery` + `useServerFn`) and the existing shadcn Table, Badge, Dialog, Input and Button (`outlineBrass`) components, with its own `head()` metadata like the other admin routes.
- `src/components/AdminSidebar.tsx` gains the new nav item.
- No database migration is required — the `user_roles` table, the `app_role` enum and `has_role` already exist.
