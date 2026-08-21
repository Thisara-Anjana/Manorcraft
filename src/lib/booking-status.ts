/** Shared booking lifecycle vocabulary used by the customer, technician and admin portals. */

export const BOOKING_FLOW = [
  "Pending",
  "Confirmed",
  "Assigned",
  "Accepted",
  "On The Way",
  "In Progress",
  "Completed",
] as const;

export type BookingStatus = (typeof BOOKING_FLOW)[number] | "Cancelled";

/** Customer-facing wording for each state. */
export const STATUS_LABEL: Record<string, string> = {
  Pending: "Pending",
  Confirmed: "Confirmed",
  Assigned: "Technician assigned",
  Accepted: "Technician accepted",
  "On The Way": "On the way",
  "In Progress": "Service started",
  Completed: "Completed",
  Cancelled: "Cancelled",
};

export const STATUS_BADGE: Record<string, string> = {
  Pending: "border-transparent bg-muted text-muted-foreground",
  Confirmed: "border-brass/40 bg-brass/10 text-accent-foreground",
  Assigned: "border-brass/50 bg-brass/15 text-accent-foreground",
  Accepted: "border-brass/60 bg-brass/25 text-accent-foreground",
  "On The Way": "border-transparent bg-primary/80 text-primary-foreground",
  "In Progress": "border-transparent bg-primary text-primary-foreground",
  Completed: "border-transparent bg-emerald-600/15 text-emerald-700",
  Cancelled: "border-transparent bg-destructive/10 text-destructive",
};

export const STATUS_DOT: Record<string, string> = {
  Pending: "bg-muted-foreground",
  Confirmed: "bg-brass/70",
  Assigned: "bg-brass",
  Accepted: "bg-brass",
  "On The Way": "bg-primary/70",
  "In Progress": "bg-primary",
  Completed: "bg-emerald-600",
  Cancelled: "bg-destructive",
};

export const OPEN_STATUSES = [
  "Pending",
  "Confirmed",
  "Assigned",
  "Accepted",
  "On The Way",
  "In Progress",
] as const;

export function statusIndex(status: string): number {
  return (BOOKING_FLOW as readonly string[]).indexOf(status);
}

export function isCancelled(status: string): boolean {
  return status === "Cancelled";
}

/** A booking can still be cancelled or rescheduled before work begins. */
export function canCustomerCancel(status: string): boolean {
  return ["Pending", "Confirmed", "Assigned", "Accepted"].includes(status);
}

export function canCustomerReschedule(status: string): boolean {
  return canCustomerCancel(status);
}
