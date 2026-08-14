import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TicketHistoryEntry = {
  history_id: string;
  ticket_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  actor_name: string;
  created_at: string;
};

/**
 * Audit trail for one ticket. RLS on job_tickets_history already limits rows to
 * the ticket owner, its assigned technician, and admins.
 */
export const getTicketHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ ticketId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<TicketHistoryEntry[]> => {
    const { data: rows, error } = await context.supabase
      .from("job_tickets_history")
      .select("history_id, ticket_id, old_status, new_status, changed_by, created_at")
      .eq("ticket_id", data.ticketId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const entries = (rows ?? []) as Omit<TicketHistoryEntry, "actor_name">[];
    const actorIds = [...new Set(entries.map((e) => e.changed_by).filter(Boolean))] as string[];
    const names = new Map<string, string>();

    if (actorIds.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [{ data: customers }, { data: technicians }] = await Promise.all([
        supabaseAdmin
          .from("customers")
          .select("customer_id, full_name")
          .in("customer_id", actorIds),
        supabaseAdmin
          .from("technicians")
          .select("technician_id, full_name")
          .in("technician_id", actorIds),
      ]);
      for (const c of customers ?? []) names.set(c.customer_id, c.full_name);
      for (const t of technicians ?? []) names.set(t.technician_id, t.full_name);
    }

    return entries.map((e) => ({
      ...e,
      actor_name: e.changed_by ? (names.get(e.changed_by) ?? "Manorcraft staff") : "System",
    }));
  });
