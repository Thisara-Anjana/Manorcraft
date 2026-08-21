import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BookingHistoryEntry = {
  id: string;
  booking_id: string;
  status: string;
  changed_by: string | null;
  actor_name: string;
  note: string | null;
  created_at: string;
};

/**
 * Audit trail for one booking. RLS already limits rows to the booking's
 * customer, its assigned technician, and admins.
 */
export const getBookingHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ bookingId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<BookingHistoryEntry[]> => {
    const { data: rows, error } = await context.supabase
      .from("booking_status_history")
      .select("id, booking_id, status, changed_by, note, created_at")
      .eq("booking_id", data.bookingId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const entries = rows ?? [];
    const actorIds = [...new Set(entries.map((e) => e.changed_by).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", actorIds);
      for (const p of profiles ?? []) names.set(p.id, p.full_name);
    }

    return entries.map((e) => ({
      id: e.id,
      booking_id: e.booking_id,
      status: e.status as string,
      changed_by: e.changed_by,
      note: e.note,
      created_at: e.created_at,
      actor_name: e.changed_by ? (names.get(e.changed_by) ?? "Manorcraft staff") : "System",
    }));
  });
