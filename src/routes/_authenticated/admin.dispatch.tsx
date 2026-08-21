import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TicketHistory } from "@/components/TicketHistory";
import { STATUS_BADGE, STATUS_LABEL } from "@/lib/booking-status";
import {
  assignTechnician,
  confirmBooking,
  listTechnicians,
  listTickets,
} from "@/lib/dispatch.functions";

export const Route = createFileRoute("/_authenticated/admin/dispatch")({
  head: () => ({
    meta: [
      { title: "Dispatch Board | Manorcraft Admin" },
      {
        name: "description",
        content: "Assign and track Manorcraft field technicians across every service ticket.",
      },
      { property: "og:title", content: "Dispatch Board | Manorcraft Admin" },
      {
        property: "og:description",
        content: "Assign and track Manorcraft field technicians across every service ticket.",
      },
    ],
  }),
  component: DispatchBoard,
});

type TicketRow = Awaited<ReturnType<typeof listTickets>>[number];
type TechnicianRow = Awaited<ReturnType<typeof listTechnicians>>[number];

function DispatchBoard() {
  const fetchTickets = useServerFn(listTickets);
  const fetchTechs = useServerFn(listTechnicians);
  const assign = useServerFn(assignTechnician);
  const confirmFn = useServerFn(confirmBooking);
  const queryClient = useQueryClient();
  const [activeTicket, setActiveTicket] = useState<string | null>(null);
  const [historyTicket, setHistoryTicket] = useState<string | null>(null);

  const tickets = useQuery({ queryKey: ["tickets"], queryFn: () => fetchTickets({}) });
  const techs = useQuery({
    queryKey: ["technicians"],
    queryFn: () => fetchTechs({}),
    enabled: !!activeTicket,
  });

  const mutation = useMutation({
    mutationFn: (vars: { ticketId: string; technicianId: string }) => assign({ data: vars }),
    onSuccess: () => {
      toast.success("Technician assigned");
      setActiveTicket(null);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history"] });
    },
    onError: (e: Error) => toast.error("Could not assign technician", { description: e.message }),
  });

  const confirmMutation = useMutation({
    mutationFn: (ticketId: string) => confirmFn({ data: { ticketId } }),
    onSuccess: () => {
      toast.success("Booking confirmed");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history"] });
    },
    onError: (e: Error) => toast.error("Could not confirm booking", { description: e.message }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Dispatch Board</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every service ticket across the Manorcraft branch network.
        </p>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="font-display text-xl">Job Tickets</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {tickets.isPending ? (
            <div className="space-y-3 px-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : tickets.isError ? (
            <p className="px-6 text-sm text-destructive">{(tickets.error as Error).message}</p>
          ) : tickets.data.length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground">No tickets have been booked yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Job Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.data.map((t: TicketRow) => (
                    <TableRow key={t.ticket_id}>
                      <TableCell className="font-medium">{t.booking_code}</TableCell>
                      <TableCell>{t.district}</TableCell>
                      <TableCell>{t.job_category}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {t.description}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE[t.job_status] ?? ""}>
                          {STATUS_LABEL[t.job_status] ?? t.job_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setHistoryTicket(t.ticket_id)}
                          >
                            History
                          </Button>
                          {t.job_status === "Pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={confirmMutation.isPending}
                              onClick={() => confirmMutation.mutate(t.ticket_id)}
                            >
                              Confirm
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outlineBrass"
                            disabled={["Completed", "Cancelled"].includes(t.job_status)}
                            onClick={() => setActiveTicket(t.ticket_id)}
                          >
                            Assign Tech
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!activeTicket} onOpenChange={(open) => !open && setActiveTicket(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Assign a technician</DialogTitle>
            <DialogDescription>
              Choose a technician to take ticket {activeTicket?.slice(0, 8).toUpperCase()}. The
              ticket status becomes “Assigned”.
            </DialogDescription>
          </DialogHeader>

          {techs.isPending ? (
            <p className="text-sm text-muted-foreground">Loading roster…</p>
          ) : techs.data && techs.data.length > 0 ? (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {techs.data.map((tech: TechnicianRow) => (
                <li
                  key={tech.technician_id}
                  className="flex items-center justify-between gap-4 rounded-md border border-border/70 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{tech.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tech.primary_skill} · {tech.current_status}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="brass"
                    disabled={mutation.isPending || tech.current_status === "Off Duty"}
                    onClick={() =>
                      activeTicket &&
                      mutation.mutate({
                        ticketId: activeTicket,
                        technicianId: tech.technician_id,
                      })
                    }
                  >
                    Assign
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No technicians on record yet. Add technicians to start dispatching.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyTicket} onOpenChange={(open) => !open && setHistoryTicket(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Status history</DialogTitle>
            <DialogDescription>
              Every recorded status change for ticket {historyTicket?.slice(0, 8).toUpperCase()}.
            </DialogDescription>
          </DialogHeader>
          {historyTicket && <TicketHistory ticketId={historyTicket} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
