import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canCustomerCancel, canCustomerReschedule } from "@/lib/booking-status";

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

export type CustomerBooking = {
  ticket_id: string;
  booking_code: string;
  district: string;
  address: string | null;
  job_category: string;
  job_status: string;
  description: string;
  scheduled_date: string | null;
  time_slot: string | null;
  created_at: string;
  technician_id: string | null;
  technician_name: string | null;
  technician_skill: string | null;
  cancellation_reason: string | null;
  reschedule_count: number;
};

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CustomerBooking[]> => {
    const { data, error } = await context.supabase
      .from("job_tickets")
      .select(
        "ticket_id, booking_code, district, address, job_category, job_status, description, scheduled_date, time_slot, created_at, technician_id, cancellation_reason, reschedule_count",
      )
      .eq("customer_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("We couldn't load your bookings. Please try again.");

    const rows = data ?? [];
    const techIds = [...new Set(rows.map((r) => r.technician_id).filter(Boolean))] as string[];
    const techs = new Map<string, { full_name: string; primary_skill: string }>();

    if (techIds.length > 0) {
      const { data: techRows } = await context.supabase
        .from("technicians")
        .select("technician_id, full_name, primary_skill")
        .in("technician_id", techIds);
      for (const t of techRows ?? []) {
        techs.set(t.technician_id, { full_name: t.full_name, primary_skill: t.primary_skill });
      }
    }

    return rows.map((r) => {
      const tech = r.technician_id ? techs.get(r.technician_id) : undefined;
      return {
        ...r,
        technician_name: tech?.full_name ?? null,
        technician_skill: tech?.primary_skill ?? null,
      } as CustomerBooking;
    });
  });

/** Customers may cancel while the job has not started yet. */
export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        ticketId: z.string().uuid(),
        reason: z.string().trim().max(300).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: ticket, error: readError } = await context.supabase
      .from("job_tickets")
      .select("ticket_id, job_status, technician_id")
      .eq("ticket_id", data.ticketId)
      .eq("customer_id", context.userId)
      .maybeSingle();
    if (readError) throw new Error("We couldn't reach your booking. Please try again.");
    if (!ticket) throw new Error("Booking not found.");
    if (!canCustomerCancel(ticket.job_status)) {
      throw new Error("This booking can no longer be cancelled — please contact us instead.");
    }

    const { error } = await context.supabase
      .from("job_tickets")
      .update({
        job_status: "Cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: data.reason?.trim() || null,
      })
      .eq("ticket_id", data.ticketId)
      .eq("customer_id", context.userId);
    if (error) throw new Error("We couldn't cancel this booking. Please try again.");

    if (ticket.technician_id) {
      await context.supabase
        .from("technicians")
        .update({ current_status: "Available" })
        .eq("technician_id", ticket.technician_id);
    }

    return { ok: true };
  });

/** Customers may move the visit before work begins. */
export const rescheduleBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        ticketId: z.string().uuid(),
        scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
        timeSlot: z.string().trim().min(1, "Choose a time slot."),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: ticket, error: readError } = await context.supabase
      .from("job_tickets")
      .select("ticket_id, job_status, reschedule_count")
      .eq("ticket_id", data.ticketId)
      .eq("customer_id", context.userId)
      .maybeSingle();
    if (readError) throw new Error("We couldn't reach your booking. Please try again.");
    if (!ticket) throw new Error("Booking not found.");
    if (!canCustomerReschedule(ticket.job_status)) {
      throw new Error("This booking is already underway and can't be rescheduled.");
    }

    const { error } = await context.supabase
      .from("job_tickets")
      .update({
        scheduled_date: data.scheduledDate,
        time_slot: data.timeSlot,
        reschedule_count: (ticket.reschedule_count ?? 0) + 1,
      })
      .eq("ticket_id", data.ticketId)
      .eq("customer_id", context.userId);
    if (error) throw new Error("We couldn't reschedule this booking. Please try again.");

    return { ok: true };
  });
