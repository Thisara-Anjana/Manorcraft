import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History } from "lucide-react";

import { getBookingHistory, type BookingHistoryEntry } from "@/lib/history.functions";
import { STATUS_DOT, STATUS_LABEL } from "@/lib/booking-status";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Read-only audit timeline of every status change on a booking. */
export function TicketHistory({ bookingId }: { bookingId: string }) {
  const fetchHistory = useServerFn(getBookingHistory);
  const history = useQuery({
    queryKey: ["booking-history", bookingId],
    queryFn: () => fetchHistory({ data: { bookingId } }) as Promise<BookingHistoryEntry[]>,
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
        <li key={entry.id} className="relative">
          <span
            className={`absolute -left-[1.42rem] top-1.5 size-2.5 rounded-full ring-2 ring-background ${
              STATUS_DOT[entry.status] ?? "bg-muted-foreground"
            }`}
          />
          <p className="text-sm font-medium text-foreground">
            {STATUS_LABEL[entry.status] ?? entry.status}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatWhen(entry.created_at)} · {entry.actor_name}
          </p>
          {entry.note && <p className="mt-1 text-xs text-muted-foreground">{entry.note}</p>}
        </li>
      ))}
    </ol>
  );
}
