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
import { STATUS_BADGE, STATUS_LABEL, formatLKR, formatTime } from "@/lib/booking-status";
import {
  assignTechnician,
  confirmBooking,
  listBookings,
  listTechnicians,
  type AdminBooking,
  type AdminTechnician,
} from "@/lib/dispatch.functions";

export const Route = createFileRoute("/_authenticated/admin/dispatch")({
  head: () => ({
    meta: [
      { title: "Dispatch Board | Manorcraft Admin" },
      {
        name: "description",
        content: "Assign and track Manorcraft field technicians across every service booking.",
      },
      { property: "og:title", content: "Dispatch Board | Manorcraft Admin" },
      {
        property: "og:description",
        content: "Assign and track Manorcraft field technicians across every service booking.",
      },
    ],
  }),
  component: DispatchBoard,
});

function DispatchBoard() {
  const fetchBookings = useServerFn(listBookings);
  const fetchTechs = useServerFn(listTechnicians);
  const assign = useServerFn(assignTechnician);
  const confirmFn = useServerFn(confirmBooking);
  const queryClient = useQueryClient();
  const [activeBooking, setActiveBooking] = useState<AdminBooking | null>(null);
  const [historyBooking, setHistoryBooking] = useState<AdminBooking | null>(null);

  const bookings = useQuery({ queryKey: ["admin-bookings"], queryFn: () => fetchBookings({}) });
  const techs = useQuery({
    queryKey: ["technicians"],
    queryFn: () => fetchTechs({}),
    enabled: !!activeBooking,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    queryClient.invalidateQueries({ queryKey: ["technicians"] });
    queryClient.invalidateQueries({ queryKey: ["booking-history"] });
  };

  const mutation = useMutation({
    mutationFn: (vars: { bookingId: string; technicianId: string }) => assign({ data: vars }),
    onSuccess: () => {
      toast.success("Technician assigned");
      setActiveBooking(null);
      invalidate();
    },
    onError: (e: Error) => toast.error("Could not assign technician", { description: e.message }),
  });

  const confirmMutation = useMutation({
    mutationFn: (bookingId: string) => confirmFn({ data: { bookingId } }),
    onSuccess: () => {
      toast.success("Booking confirmed");
      invalidate();
    },
    onError: (e: Error) => toast.error("Could not confirm booking", { description: e.message }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Dispatch Board</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every service booking across the Manorcraft island network.
        </p>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="font-display text-xl">Bookings</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {bookings.isPending ? (
            <div className="space-y-3 px-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : bookings.isError ? (
            <p className="px-6 text-sm text-destructive">{(bookings.error as Error).message}</p>
          ) : bookings.data.length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground">No bookings have been made yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.data.map((b: AdminBooking) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.booking_number}</TableCell>
                      <TableCell>{b.customer_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {[b.city_name, b.district_name].filter(Boolean).join(", ")}
                      </TableCell>
                      <TableCell>{b.service_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {b.scheduled_date} · {formatTime(b.scheduled_time)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {b.technician_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE[b.status] ?? ""}>
                          {STATUS_LABEL[b.status] ?? b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setHistoryBooking(b)}>
                            History
                          </Button>
                          {b.status === "PENDING" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={confirmMutation.isPending}
                              onClick={() => confirmMutation.mutate(b.id)}
                            >
                              Confirm
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outlineBrass"
                            disabled={["COMPLETED", "CANCELLED"].includes(b.status)}
                            onClick={() => setActiveBooking(b)}
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

      <Dialog open={!!activeBooking} onOpenChange={(open) => !open && setActiveBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Assign a technician</DialogTitle>
            <DialogDescription>
              Choose a technician for {activeBooking?.booking_number} ·{" "}
              {activeBooking?.service_name} in {activeBooking?.district_name}. Quoted{" "}
              {formatLKR(activeBooking?.estimated_price ?? 0)}.
            </DialogDescription>
          </DialogHeader>

          {techs.isPending ? (
            <p className="text-sm text-muted-foreground">Loading roster…</p>
          ) : techs.data && techs.data.length > 0 ? (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {techs.data.map((tech: AdminTechnician) => (
                <li
                  key={tech.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-border/70 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{tech.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tech.specialization} · {tech.district_name ?? "Island-wide"} ·{" "}
                      {tech.rating.toFixed(1)}★ · {tech.active_jobs} active
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="brass"
                    disabled={mutation.isPending || !tech.availability}
                    onClick={() =>
                      activeBooking &&
                      mutation.mutate({ bookingId: activeBooking.id, technicianId: tech.id })
                    }
                  >
                    {tech.availability ? "Assign" : "Off duty"}
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

      <Dialog open={!!historyBooking} onOpenChange={(open) => !open && setHistoryBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Status history</DialogTitle>
            <DialogDescription>
              Every recorded status change for {historyBooking?.booking_number}.
            </DialogDescription>
          </DialogHeader>
          {historyBooking && <TicketHistory bookingId={historyBooking.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
