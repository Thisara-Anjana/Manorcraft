import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History } from "lucide-react";

import { getTicketHistory, type TicketHistoryEntry } from "@/lib/history.functions";

const dotStyles: Record<string, string> = {
  Pending: "bg-muted-foreground",
  Assigned: "bg-brass",
  "In Progress": "bg-primary",
  Completed: "bg-emerald-600",
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Read-only audit timeline of every job_status change on a ticket. */
export function TicketHistory({ ticketId }: { ticketId: string }) {
  const fetchHistory = useServerFn(getTicketHistory);
  const history = useQuery({
    queryKey: ["ticket-history", ticketId],
    queryFn: () => fetchHistory({ data: { ticketId } }) as Promise<TicketHistoryEntry[]>,
  });

  if (history.isPending) {
    return <p className="text-sm text-muted-foreground">Loading history…</p>;
  }
  if (history.isError) {
    return <p className="text-sm text-destructive">{(history.error as Error).message}</p>;
  }
  if (!history.data || history.data.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <History className="size-4" /> No status changes recorded yet.
      </p>
    );
  }

  return (
    <ol className="relative max-h-80 space-y-5 overflow-y-auto border-l border-border/70 pl-5">
      {history.data.map((entry) => (
        <li key={entry.history_id} className="relative">
          <span
            className={`absolute -left-[1.42rem] top-1.5 size-2.5 rounded-full ring-2 ring-background ${
              dotStyles[entry.new_status] ?? "bg-muted-foreground"
            }`}
          />
          <p className="text-sm font-medium text-foreground">
            {entry.old_status
              ? `${entry.old_status} → ${entry.new_status}`
              : `Created as ${entry.new_status}`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatWhen(entry.created_at)} · {entry.actor_name}
          </p>
        </li>
      ))}
    </ol>
  );
}
