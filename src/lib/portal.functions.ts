import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPortalAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [roles, tech] = await Promise.all([
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase
        .from("technicians")
        .select("technician_id")
        .eq("technician_id", context.userId)
        .maybeSingle(),
    ]);

    const roleList = (roles.data ?? []).map((r: { role: string }) => r.role);
    return {
      isAdmin: roleList.includes("admin"),
      isTechnician: roleList.includes("technician") || !!tech.data,
    };
  });

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("job_tickets")
      .select(
        "ticket_id, district, address, job_category, job_status, description, scheduled_date, time_slot, created_at, technician_id",
      )
      .eq("customer_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
