import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/")({
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

const metrics = [
  { label: "Active Jobs", value: "24", hint: "+3 since yesterday", icon: Briefcase },
  { label: "Available Technicians", value: "11", hint: "of 18 on shift", icon: Users },
  { label: "Completed Today", value: "9", hint: "avg. 2h 40m per job", icon: CheckCircle2 },
];

type Status = "Pending" | "Assigned" | "In Progress" | "Completed";

const statusStyles: Record<Status, string> = {
  Pending: "border-transparent bg-muted text-muted-foreground",
  Assigned: "border-brass/50 bg-brass/15 text-accent-foreground",
  "In Progress": "border-transparent bg-primary text-primary-foreground",
  Completed: "border-transparent bg-emerald-600/15 text-emerald-700",
};

const tickets: {
  id: string;
  customer: string;
  district: string;
  category: string;
  status: Status;
}[] = [
  { id: "MC-1042", customer: "Nimal Perera", district: "Colombo", category: "Plumbing", status: "Pending" },
  { id: "MC-1041", customer: "Sanduni Fernando", district: "Kandy", category: "Electrical", status: "Assigned" },
  { id: "MC-1040", customer: "Ruwan Jayasuriya", district: "Anuradhapura", category: "AC Repair", status: "In Progress" },
  { id: "MC-1039", customer: "Ishara Wickrama", district: "Colombo", category: "Masonry", status: "Completed" },
  { id: "MC-1038", customer: "Dilani Silva", district: "Kandy", category: "Plumbing", status: "Pending" },
  { id: "MC-1037", customer: "Kasun Bandara", district: "Colombo", category: "Electrical", status: "In Progress" },
];

function AdminOverview() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live snapshot of Manorcraft service operations.
        </p>
      </div>

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
              <p className="font-display text-4xl text-foreground">{m.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.hint}</p>
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
                {tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.id}</TableCell>
                    <TableCell>{t.customer}</TableCell>
                    <TableCell>{t.district}</TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell>
                      <Badge className={statusStyles[t.status]}>{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outlineBrass"
                        disabled={t.status === "Completed"}
                        onClick={() => toast.success(`Assigning a technician to ${t.id}`)}
                      >
                        Assign Tech
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
