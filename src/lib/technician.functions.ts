import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkIsTechnician = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("technicians")
      .select("technician_id, full_name, primary_skill, current_status")
      .eq("technician_id", context.userId)
      .maybeSingle();
    return { isTechnician: !!data, profile: data ?? null };
  });

export const listMyJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("job_tickets")
      .select(
        "ticket_id, customer_id, district, address, job_category, job_status, description, scheduled_date, time_slot, created_at",
      )
      .eq("technician_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const tickets = data ?? [];
    if (tickets.length === 0) return [];

    // Names of customers on the technician's own tickets only.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = [...new Set(tickets.map((t: { customer_id: string }) => t.customer_id))];
    const { data: customers } = await supabaseAdmin
      .from("customers")
      .select("customer_id, full_name")
      .in("customer_id", ids);

    const names = new Map((customers ?? []).map((c) => [c.customer_id, c.full_name]));
    return tickets.map((t: Record<string, unknown>) => ({
      ...t,
      customer_name: names.get(t["customer_id"] as string) ?? "Manorcraft client",
    }));
  });

export const updateJobStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        ticketId: z.string().uuid(),
        status: z.enum(["In Progress", "Completed"]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("job_tickets")
      .update({ job_status: data.status })
      .eq("ticket_id", data.ticketId)
      .eq("technician_id", context.userId);
    if (error) throw new Error(error.message);

    if (data.status === "Completed") {
      const { data: open } = await context.supabase
        .from("job_tickets")
        .select("ticket_id")
        .eq("technician_id", context.userId)
        .in("job_status", ["Assigned", "In Progress"]);
      if (!open || open.length === 0) {
        await context.supabase
          .from("technicians")
          .update({ current_status: "Available" })
          .eq("technician_id", context.userId);
      }
    } else {
      await context.supabase
        .from("technicians")
        .update({ current_status: "On Job" })
        .eq("technician_id", context.userId);
    }

    return { ok: true };
  });
