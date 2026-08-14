import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, CheckCircle2, Users } from "lucide-react";

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
import { getAdminOverview } from "@/lib/dispatch.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Overview | Manorcraft Operations" },
      {
        name: "description",
        content:
          "Monitor active jobs, technician availability and recent service tickets across Manorcraft's Sri Lanka network.",
      },
      { property: "og:title", content: "Admin Overview | Manorcraft Operations" },
      {
        property: "og:description",
        content:
          "Monitor active jobs, technician availability and recent service tickets across Manorcraft's Sri Lanka network.",
      },
    ],
  }),
  component: AdminOverview,
});

const statusStyles: Record<string, string> = {
  Pending: "border-transparent bg-muted text-muted-foreground",
  Assigned: "border-brass/50 bg-brass/15 text-accent-foreground",
  "In Progress": "border-transparent bg-primary text-primary-foreground",
  Completed: "border-transparent bg-emerald-600/15 text-emerald-700",
};

function AdminOverview() {
  const fetchOverview = useServerFn(getAdminOverview);
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview({}),
  });

  const metrics = [
    {
      label: "Active Jobs",
      value: data?.metrics.activeJobs,
      hint: "Not yet completed",
      icon: Briefcase,
    },
    {
      label: "Available Technicians",
      value: data?.metrics.availableTechnicians,
      hint: `of ${data?.metrics.totalTechnicians ?? 0} on the roster`,
      icon: Users,
    },
    {
      label: "Completed Today",
      value: data?.metrics.completedToday,
      hint: "Since midnight",
      icon: CheckCircle2,
    },
  ];

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
        {metrics.map((m) => (
          <Card key={m.label} className="border-border/70">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {m.label}
              </CardTitle>
              <span className="rounded-md bg-brass/15 p-2 text-brass">
                <m.icon className="h-4 w-4" />
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
                  <p className="font-display text-4xl text-foreground">{m.value ?? 0}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{m.hint}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="font-display text-xl">Recent Job Tickets</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Service Category</TableHead>
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
                  : (data?.recent ?? []).map((t) => (
                      <TableRow key={t.ticket_id}>
                        <TableCell className="font-medium uppercase">
                          {t.ticket_id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{t.customer_name}</TableCell>
                        <TableCell>{t.district}</TableCell>
                        <TableCell>{t.job_category}</TableCell>
                        <TableCell>
                          <Badge className={statusStyles[t.job_status] ?? ""}>{t.job_status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            asChild
                            size="sm"
                            variant="outlineBrass"
                            disabled={t.job_status === "Completed"}
                          >
                            <Link to="/admin/dispatch">Assign Tech</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
            {!isPending && (data?.recent.length ?? 0) === 0 && (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No job tickets booked yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
