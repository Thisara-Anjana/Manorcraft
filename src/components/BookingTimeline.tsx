import { Check, XCircle } from "lucide-react";

import { BOOKING_FLOW, STATUS_LABEL, isCancelled, statusIndex } from "@/lib/booking-status";
import { cn } from "@/lib/utils";

/** Visual progress timeline of the booking lifecycle. */
export function BookingTimeline({ status, className }: { status: string; className?: string }) {
  const cancelled = isCancelled(status);
  const current = statusIndex(status);

  if (cancelled) {
    return (
      <p
        className={cn(
          "flex items-center gap-2 rounded-sm bg-destructive/10 px-4 py-3 text-sm text-destructive",
          className,
        )}
      >
        <XCircle className="size-4 shrink-0" /> This booking was cancelled.
      </p>
    );
  }

  return (
    <ol
      className={cn("flex flex-wrap gap-y-4 sm:flex-nowrap", className)}
      aria-label="Booking progress"
    >
      {BOOKING_FLOW.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex min-w-[4.5rem] flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span
                className={cn(
                  "h-px flex-1",
                  i === 0 ? "bg-transparent" : done || active ? "bg-brass" : "bg-border",
                )}
              />
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.6rem] font-medium",
                  done && "border-brass bg-brass text-primary",
                  active && "border-brass bg-brass/20 text-brass ring-2 ring-brass/30",
                  !done && !active && "border-border bg-background text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "h-px flex-1",
                  i === BOOKING_FLOW.length - 1
                    ? "bg-transparent"
                    : done
                      ? "bg-brass"
                      : "bg-border",
                )}
              />
            </div>
            <span
              className={cn(
                "mt-2 px-1 text-[0.62rem] uppercase tracking-[0.12em]",
                active ? "text-brass" : done ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {STATUS_LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
