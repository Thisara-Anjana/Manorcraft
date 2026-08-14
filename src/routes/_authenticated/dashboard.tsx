import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Clock, MapPin, Plus, Wrench } from "lucide-react";

import { SiteNav } from "@/components/SiteNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyBookings } from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My Bookings | Manorcraft Customer Portal" },
      {
        name: "description",
        content:
          "Track the status of your Manorcraft home service requests and book a new visit with a verified technician.",
      },
      { property: "og:title", content: "My Bookings | Manorcraft Customer Portal" },
      {
        property: "og:description",
        content: "Track your Manorcraft service requests from Pending through Completed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerDashboard,
});

type Booking = {
  ticket_id: string;
  district: string;
  address: string | null;
  job_category: string;
  job_status: string;
  description: string;
  scheduled_date: string | null;
  time_slot: string | null;
  created_at: string;
  technician_id: string | null;
};

const statusStyles: Record<string, string> = {
  Pending: "border-transparent bg-muted text-muted-foreground",
  Assigned: "border-brass/50 bg-brass/15 text-accent-foreground",
  "In Progress": "border-transparent bg-primary text-primary-foreground",
  Completed: "border-transparent bg-emerald-600/15 text-emerald-700",
};

function CustomerDashboard() {
  const fetchBookings = useServerFn(listMyBookings);
  const { data, isPending } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => fetchBookings({}) as Promise<Booking[]>,
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteNav solid />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-brass">Customer Portal</p>
            <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground">
              My Service Requests
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Follow every Manorcraft visit from request to completion.
            </p>
          </div>
          <Button asChild variant="brass">
            <Link to="/book">
              <Plus className="mr-2 h-4 w-4" /> Book a Service
            </Link>
          </Button>
        </div>

        <div className="mt-10 space-y-4">
          {isPending ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-md border border-border/70 bg-card p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-md" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="mt-5 h-4 w-full" />
                  <Skeleton className="mt-3 h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <div className="rounded-md border border-border/70 bg-card p-10 text-center">
              <h2 className="font-display text-2xl">No bookings yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Book your first Manorcraft visit and it will appear here with live status updates.
              </p>
              <Button asChild variant="brass" className="mt-6">
                <Link to="/book">Book a Service</Link>
              </Button>
            </div>
          ) : (
            data.map((b) => (
              <article
                key={b.ticket_id}
                className="rounded-md border border-border/70 bg-card p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-brass/15 p-2 text-brass">
                      <Wrench className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="font-display text-xl text-foreground">{b.job_category}</h2>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Ticket {b.ticket_id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <Badge className={statusStyles[b.job_status] ?? ""}>{b.job_status}</Badge>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">{b.description}</p>

                <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-brass" />
                    {b.district}
                  </span>
                  {b.scheduled_date && (
                    <span className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-brass" />
                      {b.scheduled_date}
                    </span>
                  )}
                  {b.time_slot && (
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-brass" />
                      {b.time_slot}
                    </span>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
