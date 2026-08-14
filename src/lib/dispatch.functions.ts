import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin access required");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

export const listTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("job_tickets")
      .select(
        "ticket_id, district, job_category, job_status, description, technician_id, scheduled_date, time_slot, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const [ticketsRes, techsRes] = await Promise.all([
      context.supabase
        .from("job_tickets")
        .select("ticket_id, customer_id, district, job_category, job_status, updated_at, created_at")
        .order("created_at", { ascending: false }),
      context.supabase.from("technicians").select("technician_id, current_status"),
    ]);
    if (ticketsRes.error) throw new Error(ticketsRes.error.message);
    if (techsRes.error) throw new Error(techsRes.error.message);

    const tickets = (ticketsRes.data ?? []) as any[];
    const techs = (techsRes.data ?? []) as any[];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const recent = tickets.slice(0, 6);
    let names = new Map<string, string>();
    if (recent.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: customers } = await supabaseAdmin
        .from("customers")
        .select("customer_id, full_name")
        .in("customer_id", [...new Set(recent.map((t) => t.customer_id))]);
      names = new Map((customers ?? []).map((c) => [c.customer_id, c.full_name]));
    }

    return {
      metrics: {
        activeJobs: tickets.filter((t) => t.job_status !== "Completed").length,
        availableTechnicians: techs.filter((t) => t.current_status === "Available").length,
        totalTechnicians: techs.length,
        completedToday: tickets.filter(
          (t) => t.job_status === "Completed" && new Date(t.updated_at) >= startOfToday,
        ).length,
      },
      recent: recent.map((t) => ({
        ticket_id: t.ticket_id as string,
        customer_name: names.get(t.customer_id) ?? "Manorcraft client",
        district: t.district as string,
        job_category: t.job_category as string,
        job_status: t.job_status as string,
      })),
    };
  });


export const listTechnicians = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("technicians")
      .select("technician_id, full_name, primary_skill, current_status")
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const assignTechnician = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ ticketId: z.string().uuid(), technicianId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("job_tickets")
      .update({ technician_id: data.technicianId, job_status: "Assigned" })
      .eq("ticket_id", data.ticketId);
    if (error) throw new Error(error.message);

    await context.supabase
      .from("technicians")
      .update({ current_status: "On Job" })
      .eq("technician_id", data.technicianId);

    return { ok: true };
  });
