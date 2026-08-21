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

export const setAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ status: z.enum(["Available", "Off Duty"]) }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("technicians")
      .update({ current_status: data.status })
      .eq("technician_id", context.userId);
    if (error) throw new Error("We couldn't update your availability. Please try again.");
    return { ok: true };
  });

export const listMyJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("job_tickets")
      .select(
        "ticket_id, booking_code, customer_id, district, address, latitude, longitude, job_category, job_status, description, scheduled_date, time_slot, created_at",
      )
      .eq("technician_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("We couldn't load your jobs. Please try again.");

    const tickets = data ?? [];
    if (tickets.length === 0) return [];

    // Names of customers on the technician's own tickets only.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = [...new Set(tickets.map((t: { customer_id: string }) => t.customer_id))];
    const { data: customers } = await supabaseAdmin
      .from("customers")
      .select("customer_id, full_name, phone_number")
      .in("customer_id", ids);

    const profiles = new Map((customers ?? []).map((c) => [c.customer_id, c]));
    return tickets.map((t: Record<string, unknown>) => {
      const profile = profiles.get(t["customer_id"] as string);
      return {
        ...t,
        customer_name: profile?.full_name ?? "Manorcraft client",
        customer_phone: profile?.phone_number ?? null,
      };
    });
  });

/** Technician accepts a dispatch assignment. */
export const acceptJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ ticketId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("job_tickets")
      .update({ job_status: "Accepted" })
      .eq("ticket_id", data.ticketId)
      .eq("technician_id", context.userId)
      .eq("job_status", "Assigned");
    if (error) throw new Error("We couldn't accept this job. Please try again.");

    await context.supabase
      .from("technicians")
      .update({ current_status: "On Job" })
      .eq("technician_id", context.userId);
    return { ok: true };
  });

/** Technician declines — the job returns to dispatch unassigned. */
export const rejectJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ ticketId: z.string().uuid(), reason: z.string().trim().max(300).optional() })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("job_tickets")
      .update({ job_status: "Confirmed", technician_id: null })
      .eq("ticket_id", data.ticketId)
      .eq("technician_id", context.userId)
      .eq("job_status", "Assigned");
    if (error) throw new Error("We couldn't decline this job. Please try again.");

    const { data: open } = await context.supabase
      .from("job_tickets")
      .select("ticket_id")
      .eq("technician_id", context.userId)
      .in("job_status", ["Assigned", "Accepted", "On The Way", "In Progress"]);
    if (!open || open.length === 0) {
      await context.supabase
        .from("technicians")
        .update({ current_status: "Available" })
        .eq("technician_id", context.userId);
    }
    return { ok: true };
  });

export const updateJobStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        ticketId: z.string().uuid(),
        status: z.enum(["On The Way", "In Progress", "Completed"]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("job_tickets")
      .update({ job_status: data.status })
      .eq("ticket_id", data.ticketId)
      .eq("technician_id", context.userId);
    if (error) throw new Error("We couldn't update this job. Please try again.");

    if (data.status === "Completed") {
      const { data: open } = await context.supabase
        .from("job_tickets")
        .select("ticket_id")
        .eq("technician_id", context.userId)
        .in("job_status", ["Assigned", "Accepted", "On The Way", "In Progress"]);
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
