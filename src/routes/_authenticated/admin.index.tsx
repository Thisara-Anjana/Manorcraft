import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, CheckCircle2, Star, Users, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_BADGE, STATUS_LABEL, formatLKR } from "@/lib/booking-status";
import { getAdminOverview } from "@/lib/dispatch.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Overview | Manorcraft Operations" },
      {
        name: "description",
        content:
          "Monitor active bookings, technician availability, revenue and recent jobs across Manorcraft's Sri Lanka network.",
      },
      { property: "og:title", content: "Admin Overview | Manorcraft Operations" },
      {
        property: "og:description",
        content:
          "Monitor active bookings, technician availability, revenue and recent jobs across Manorcraft's Sri Lanka network.",
      },
    ],
  }),
  component: AdminOverview,
});

function Bars({ rows }: { rows: { label: string; value: number; display?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">{r.label}</span>
            <span className="text-muted-foreground">{r.display ?? r.value}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-brass"
              style={{ width: `${Math.round((r.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function AdminOverview() {
  const fetchOverview = useServerFn(getAdminOverview);
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview({}),
  });

  const m = data?.metrics;
  const metrics = [
    {
      label: "Active Bookings",
      value: m?.activeBookings ?? 0,
      hint: `${m?.pendingBookings ?? 0} awaiting confirmation`,
      icon: Briefcase,
    },
    {
      label: "Available Technicians",
      value: m?.availableTechnicians ?? 0,
      hint: `of ${m?.totalTechnicians ?? 0} on the roster`,
      icon: Users,
    },
    {
      label: "Completed Today",
      value: m?.completedToday ?? 0,
      hint: `${m?.completedBookings ?? 0} all time`,
      icon: CheckCircle2,
    },
    {
      label: "Revenue",
      value: formatLKR(m?.totalRevenue ?? 0),
      hint: `${m?.totalCustomers ?? 0} customers`,
      icon: Wallet,
    },
    {
      label: "Average Rating",
      value: (m?.averageRating ?? 0).toFixed(1),
      hint: "Across all reviews",
      icon: Star,
    },
  ];

  const maxDay = Math.max(1, ...(data?.bookingsByDay ?? []).map((d) => d.count));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live snapshot of Manorcraft service operations.
        </p>
      </div>

      {isError && (
        <p className="rounded-sm border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error).message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="border-border/70">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {metric.label}
              </CardTitle>
              <span className="rounded-md bg-brass/15 p-2 text-brass">
                <metric.icon className="h-4 w-4" />
              </span>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <>
                  <Skeleton className="h-10 w-16" />
                  <Skeleton className="mt-2 h-3 w-28" />
                </>
              ) : (
                <>
                  <p className="font-display text-4xl text-foreground">{metric.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="font-display text-xl">Bookings · last 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="flex h-32 items-end gap-2">
              {(data?.bookingsByDay ?? []).map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-sm bg-brass/70"
                    style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }}
                    title={`${d.day}: ${d.count}`}
                  />
                  <span className="text-[0.6rem] text-muted-foreground">{d.day.slice(8)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="font-display text-xl">Top districts</CardTitle>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <Bars
                rows={(data?.bookingsByDistrict ?? []).map((d) => ({
                  label: d.district,
                  value: d.count,
                }))}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="font-display text-xl">Revenue by service</CardTitle>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <Bars
                rows={(data?.revenueByService ?? []).map((r) => ({
                  label: r.service,
                  value: r.revenue,
                  display: formatLKR(r.revenue),
                }))}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="font-display text-xl">Technician performance</CardTitle>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <Bars
                rows={(data?.technicianPerformance ?? []).slice(0, 6).map((t) => ({
                  label: t.name,
                  value: t.completed,
                  display: `${t.completed} jobs · ${t.rating.toFixed(1)}★`,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="font-display text-xl">Recent bookings</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : (data?.recent ?? []).map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.booking_number}</TableCell>
                        <TableCell>{b.customer_name}</TableCell>
                        <TableCell>{b.district_name}</TableCell>
                        <TableCell>{b.service_name}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_BADGE[b.status] ?? ""}>
                            {STATUS_LABEL[b.status] ?? b.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outlineBrass">
                            <Link to="/admin/dispatch">Manage</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
            {!isPending && (data?.recent.length ?? 0) === 0 && (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No bookings yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
