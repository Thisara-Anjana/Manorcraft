/** Shared booking lifecycle vocabulary used by the customer, technician and admin portals. */

export const BOOKING_FLOW = [
  "PENDING",
  "CONFIRMED",
  "TECHNICIAN_ASSIGNED",
  "TECHNICIAN_ACCEPTED",
  "ON_THE_WAY",
  "SERVICE_STARTED",
  "COMPLETED",
] as const;

export type BookingStatus = (typeof BOOKING_FLOW)[number] | "CANCELLED";

/** Customer-facing wording for each state. */
export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  TECHNICIAN_ASSIGNED: "Technician assigned",
  TECHNICIAN_ACCEPTED: "Technician accepted",
  ON_THE_WAY: "On the way",
  SERVICE_STARTED: "Service started",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const STATUS_BADGE: Record<string, string> = {
  PENDING: "border-transparent bg-muted text-muted-foreground",
  CONFIRMED: "border-brass/40 bg-brass/10 text-accent-foreground",
  TECHNICIAN_ASSIGNED: "border-brass/50 bg-brass/15 text-accent-foreground",
  TECHNICIAN_ACCEPTED: "border-brass/60 bg-brass/25 text-accent-foreground",
  ON_THE_WAY: "border-transparent bg-primary/80 text-primary-foreground",
  SERVICE_STARTED: "border-transparent bg-primary text-primary-foreground",
  COMPLETED: "border-transparent bg-emerald-600/15 text-emerald-700",
  CANCELLED: "border-transparent bg-destructive/10 text-destructive",
};

export const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-muted-foreground",
  CONFIRMED: "bg-brass/70",
  TECHNICIAN_ASSIGNED: "bg-brass",
  TECHNICIAN_ACCEPTED: "bg-brass",
  ON_THE_WAY: "bg-primary/70",
  SERVICE_STARTED: "bg-primary",
  COMPLETED: "bg-emerald-600",
  CANCELLED: "bg-destructive",
};

export const OPEN_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "TECHNICIAN_ASSIGNED",
  "TECHNICIAN_ACCEPTED",
  "ON_THE_WAY",
  "SERVICE_STARTED",
] as const;

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function statusIndex(status: string): number {
  return (BOOKING_FLOW as readonly string[]).indexOf(status);
}

export function isCancelled(status: string): boolean {
  return status === "CANCELLED";
}

/** A booking can still be cancelled or rescheduled before work begins. */
export function canCustomerCancel(status: string): boolean {
  return ["PENDING", "CONFIRMED", "TECHNICIAN_ASSIGNED", "TECHNICIAN_ACCEPTED"].includes(status);
}

export function canCustomerReschedule(status: string): boolean {
  return canCustomerCancel(status);
}

export function formatLKR(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `LKR ${Number(value).toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const [h = "0", m = "00"] = value.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${suffix}`;
}
