import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import {
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Star,
  UserCheck,
  Wrench,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { SiteNav } from "@/components/SiteNav";
import { BookingTimeline } from "@/components/BookingTimeline";
import { TicketHistory } from "@/components/TicketHistory";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  STATUS_BADGE,
  STATUS_LABEL,
  canCustomerCancel,
  canCustomerReschedule,
  formatLKR,
  formatTime,
} from "@/lib/booking-status";
import {
  cancelBooking,
  listMyBookings,
  rescheduleBooking,
  submitReview,
  type CustomerBooking,
} from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My Bookings | Manorcraft Customer Portal" },
      {
        name: "description",
        content:
          "Track your Manorcraft home service requests live — from confirmation to technician arrival and completion.",
      },
      { property: "og:title", content: "My Bookings | Manorcraft Customer Portal" },
      {
        property: "og:description",
        content: "Live tracking, rescheduling and cancellation for your Manorcraft bookings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerDashboard,
});

const TIME_SLOTS = ["08:00", "10:00", "13:00", "15:00", "17:00"];

function CustomerDashboard() {
  const queryClient = useQueryClient();
  const fetchBookings = useServerFn(listMyBookings);
  const { data, isPending, isError } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => fetchBookings({}),
  });

  // Live status tracking: any change to this customer's bookings refreshes the list.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelledEffect = false;

    supabase.auth.getUser().then(({ data: auth }) => {
      const uid = auth.user?.id;
      if (!uid || cancelledEffect) return;
      channel = supabase
        .channel(`bookings-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookings",
            filter: `customer_id=eq.${uid}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
            queryClient.invalidateQueries({ queryKey: ["booking-history"] });
          },
        )
        .subscribe();
    });

    return () => {
      cancelledEffect = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav solid />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-brass">Customer Portal</p>
            <h1 className="mt-2 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
              My Service Requests
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Follow every Manorcraft visit from request to completion, live.
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
            Array.from({ length: 3 }).map((_, i) => (
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
            ))
          ) : isError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center">
              <h2 className="font-display text-2xl text-destructive">We couldn't load bookings</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Please check your connection and try again.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["my-bookings"] })}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
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
            data.map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </div>
      </main>
    </div>
  );
}

function BookingCard({ booking: b }: { booking: CustomerBooking }) {
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [date, setDate] = useState<Date | undefined>(
    b.scheduled_date ? new Date(b.scheduled_date) : undefined,
  );
  const [slot, setSlot] = useState((b.scheduled_time ?? "").slice(0, 5));

  const doCancel = useServerFn(cancelBooking);
  const doReschedule = useServerFn(rescheduleBooking);
  const doReview = useServerFn(submitReview);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["booking-history"] });
  };

  const cancelMutation = useMutation({
    mutationFn: () => doCancel({ data: { bookingId: b.id, reason } }),
    onSuccess: () => {
      toast.success(`Booking ${b.booking_number} cancelled`);
      setCancelOpen(false);
      refresh();
    },
    onError: (error: Error) =>
      toast.error("Could not cancel booking", { description: error.message }),
  });

  const rescheduleMutation = useMutation({
    mutationFn: () =>
      doReschedule({
        data: {
          bookingId: b.id,
          scheduledDate: date ? format(date, "yyyy-MM-dd") : "",
          scheduledTime: slot,
        },
      }),
    onSuccess: () => {
      toast.success(`Booking ${b.booking_number} rescheduled`);
      setRescheduleOpen(false);
      refresh();
    },
    onError: (error: Error) =>
      toast.error("Could not reschedule booking", { description: error.message }),
  });

  const reviewMutation = useMutation({
    mutationFn: () => doReview({ data: { bookingId: b.id, rating, comment } }),
    onSuccess: () => {
      toast.success("Thank you for your review");
      setReviewOpen(false);
      refresh();
    },
    onError: (error: Error) =>
      toast.error("Could not save your review", { description: error.message }),
  });

  return (
    <article className="rounded-md border border-border/70 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-brass/15 p-2 text-brass">
            <Wrench className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-xl text-foreground">{b.service_name}</h2>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {b.booking_number}
            </p>
          </div>
        </div>
        <Badge className={STATUS_BADGE[b.status] ?? ""}>{STATUS_LABEL[b.status] ?? b.status}</Badge>
      </div>

      <BookingTimeline status={b.status} className="mt-6" />

      <p className="mt-5 text-sm text-muted-foreground">{b.problem_description}</p>

      <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
        <span className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-brass" />
          {[b.city_name, b.district_name].filter(Boolean).join(", ")}
        </span>
        {b.scheduled_date && (
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-brass" />
            {b.scheduled_date}
          </span>
        )}
        {b.scheduled_time && (
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-brass" />
            {formatTime(b.scheduled_time)}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {b.final_price !== null ? "Final price" : "Estimated from"}{" "}
        <span className="font-medium text-foreground">
          {formatLKR(b.final_price ?? b.estimated_price)}
        </span>
      </p>

      {b.technician_name && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-sm bg-secondary/50 px-3 py-2 text-sm text-foreground">
          <span className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 shrink-0 text-brass" />
            {b.technician_name}
          </span>
          {b.technician_phone && (
            <a
              href={`tel:${b.technician_phone}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-brass"
            >
              <Phone className="h-4 w-4" /> {b.technician_phone}
            </a>
          )}
        </div>
      )}

      {b.cancellation_reason && (
        <p className="mt-3 text-sm text-muted-foreground">Reason: {b.cancellation_reason}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {canCustomerReschedule(b.status) && (
          <Button variant="outline" size="sm" onClick={() => setRescheduleOpen(true)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reschedule
          </Button>
        )}
        {canCustomerCancel(b.status) && (
          <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)}>
            <XCircle className="mr-2 h-4 w-4" /> Cancel
          </Button>
        )}
        {b.status === "COMPLETED" && !b.has_review && (
          <Button variant="brass" size="sm" onClick={() => setReviewOpen(true)}>
            <Star className="mr-2 h-4 w-4" /> Leave a review
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? "Hide history" : "Status history"}
        </Button>
      </div>

      {showHistory && (
        <div className="mt-4 rounded-sm bg-muted/40 p-4">
          <TicketHistory bookingId={b.id} />
        </div>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel booking {b.booking_number}?</DialogTitle>
            <DialogDescription>
              This releases your {b.service_name.toLowerCase()} slot. You can always book again.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            maxLength={300}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep booking
            </Button>
            <Button
              variant="brass"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule {b.booking_number}</DialogTitle>
            <DialogDescription>Choose a new preferred date and arrival time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-sm border"
            />
            <Select value={slot} onValueChange={setSlot}>
              <SelectTrigger>
                <SelectValue placeholder="Select an arrival time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {formatTime(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
              Back
            </Button>
            <Button
              variant="brass"
              disabled={!date || !slot || rescheduleMutation.isPending}
              onClick={() => rescheduleMutation.mutate()}
            >
              {rescheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save new time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate {b.service_name}</DialogTitle>
            <DialogDescription>
              How was your visit{b.technician_name ? ` with ${b.technician_name}` : ""}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setRating(n)}
                className="p-1"
              >
                <Star
                  className={`h-7 w-7 ${n <= rating ? "fill-brass text-brass" : "text-muted-foreground"}`}
                />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell other households about the craftsmanship (optional)"
            maxLength={600}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Not now
            </Button>
            <Button
              variant="brass"
              disabled={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate()}
            >
              {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
