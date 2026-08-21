import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  History,
  MapPin,
  Navigation,
  Phone,
  PlayCircle,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TicketHistory } from "@/components/TicketHistory";
import { STATUS_BADGE, STATUS_LABEL } from "@/lib/booking-status";
import {
  acceptJob,
  checkIsTechnician,
  listMyJobs,
  rejectJob,
  updateJobStatus,
} from "@/lib/technician.functions";

export const Route = createFileRoute("/_authenticated/technician")({
  head: () => ({
    meta: [
      { title: "Technician Portal | Manorcraft Field Jobs" },
      {
        name: "description",
        content:
          "View your assigned Manorcraft jobs and update progress from Assigned to In Progress to Completed on any mobile device.",
      },
      { property: "og:title", content: "Technician Portal | Manorcraft Field Jobs" },
      {
        property: "og:description",
        content: "Track and update your assigned Manorcraft service jobs in the field.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TechnicianPortal,
});

type Job = {
  ticket_id: string;
  booking_code: string;
  customer_name: string;
  customer_phone: string | null;
  district: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  job_category: string;
  job_status: string;
  description: string;
  scheduled_date: string | null;
  time_slot: string | null;
};

function TechnicianPortal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const check = useServerFn(checkIsTechnician);
  const fetchJobs = useServerFn(listMyJobs);
  const setStatus = useServerFn(updateJobStatus);
  const accept = useServerFn(acceptJob);
  const reject = useServerFn(rejectJob);

  const access = useQuery({ queryKey: ["is-technician"], queryFn: () => check({}) });
  const jobs = useQuery({
    queryKey: ["my-jobs"],
    queryFn: () => fetchJobs({}) as Promise<Job[]>,
    enabled: !!access.data?.isTechnician,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["my-jobs"] });
    queryClient.invalidateQueries({ queryKey: ["ticket-history"] });
  };

  const mutation = useMutation({
    mutationFn: (vars: {
      ticketId: string;
      action: "accept" | "reject" | "On The Way" | "In Progress" | "Completed";
    }) => {
      if (vars.action === "accept") return accept({ data: { ticketId: vars.ticketId } });
      if (vars.action === "reject") return reject({ data: { ticketId: vars.ticketId } });
      return setStatus({ data: { ticketId: vars.ticketId, status: vars.action } });
    },
    onSuccess: (_res, vars) => {
      const messages: Record<string, string> = {
        accept: "Job accepted",
        reject: "Job returned to dispatch",
        "On The Way": "Customer notified you're on the way",
        "In Progress": "Service started",
        Completed: "Job completed",
      };
      toast.success(messages[vars.action] ?? "Job updated");
      refresh();
    },
    onError: (error: Error) => toast.error("Could not update job", { description: error.message }),
  });

  // Role protection: non-technicians are redirected to the portal they can use.
  useEffect(() => {
    if (access.isPending || !access.data || access.data.isTechnician) return;
    toast.error("The field portal is for technicians only", {
      description: "Taking you back to your dashboard.",
    });
    navigate({ to: "/dashboard", replace: true });
  }, [access.isPending, access.data, navigate]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/technician-login", replace: true });
  };

  const list = jobs.data ?? [];
  const active = list.filter((j) => !["Completed", "Cancelled"].includes(j.job_status));
  const done = list.filter((j) => ["Completed", "Cancelled"].includes(j.job_status));

  return (
    <div className="min-h-screen bg-muted/30 pb-16">
      <header className="surface-navy sticky top-0 z-20 px-5 py-5">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-brass/70">
              <span className="font-display text-base text-brass">M</span>
            </span>
            <span className="font-display text-lg uppercase tracking-[0.16em] text-primary-foreground">
              Field Portal
            </span>
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="min-h-11 px-2 text-xs uppercase tracking-[0.16em] text-primary-foreground/75 hover:text-brass"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8">
        {access.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-brass" /> Checking your field credentials…
          </p>
        ) : !access.data?.isTechnician ? (
          <div className="rounded-sm border border-border/70 bg-background p-8 text-center">
            <h1 className="font-display text-2xl">Field access only</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This portal is reserved for Manorcraft technicians — redirecting you to your
              dashboard…
            </p>
          </div>
        ) : (
          <>
            <span className="text-[0.7rem] uppercase tracking-[0.3em] text-muted-foreground">
              {access.data.profile?.primary_skill ?? "Technician"}
            </span>
            <h1 className="mt-2 font-display text-3xl font-light text-foreground">
              {access.data.profile?.full_name ?? "My Jobs"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {active.length} active {active.length === 1 ? "job" : "jobs"} · {done.length}{" "}
              completed
            </p>

            {jobs.isPending ? (
              <div className="mt-8 space-y-5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-sm border border-border/70 bg-background p-5">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="mt-3 h-4 w-28" />
                    <Skeleton className="mt-5 h-4 w-full" />
                    <Skeleton className="mt-3 h-4 w-3/4" />
                    <Skeleton className="mt-5 h-14 w-full" />
                  </div>
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="mt-8 rounded-sm border border-dashed border-border bg-background p-10 text-center">
                <p className="font-display text-xl">No jobs assigned yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  New assignments from dispatch will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-8 space-y-5">
                {[...active, ...done].map((job) => (
                  <JobCard
                    key={job.ticket_id}
                    job={job}
                    pending={mutation.isPending && mutation.variables?.ticketId === job.ticket_id}
                    onAction={(action) => mutation.mutate({ ticketId: job.ticket_id, action })}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

type JobAction = "accept" | "reject" | "On The Way" | "In Progress" | "Completed";

function JobCard({
  job,
  pending,
  onAction,
}: {
  job: Job;
  pending: boolean;
  onAction: (action: JobAction) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [confirming, setConfirming] = useState<JobAction | null>(null);

  const confirmCopy: Record<JobAction, { title: string; body: string; cta: string }> = {
    accept: {
      title: `Accept ${job.booking_code}?`,
      body: "The customer will be told you're handling this job.",
      cta: "Accept job",
    },
    reject: {
      title: `Decline ${job.booking_code}?`,
      body: "The job goes back to dispatch for reassignment.",
      cta: "Decline job",
    },
    "On The Way": {
      title: "Mark yourself on the way?",
      body: "The customer will see that you're travelling to them.",
      cta: "I'm on the way",
    },
    "In Progress": {
      title: "Start this service?",
      body: "This records the service start time on the booking timeline.",
      cta: "Start service",
    },
    Completed: {
      title: "Complete this service?",
      body: "The customer will be able to review the visit once completed.",
      cta: "Complete service",
    },
  };

  const mapsHref =
    job.latitude != null && job.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${job.latitude},${job.longitude}`
      : job.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${job.address}, ${job.district}, Sri Lanka`)}`
        : null;

  const bigButton = (action: JobAction, icon: React.ReactNode, label: string) => (
    <Button
      variant="brass"
      className="h-14 w-full text-base active:scale-[0.98]"
      disabled={pending}
      onClick={() => setConfirming(action)}
    >
      {pending ? <Loader2 className="animate-spin" /> : icon} {label}
    </Button>
  );

  return (
    <article className="overflow-hidden rounded-sm border border-border/70 bg-background shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-secondary/40 px-5 py-4">
        <div>
          <p className="font-display text-xl leading-tight text-foreground">{job.job_category}</p>
          <p className="mt-1 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
            {job.booking_code}
          </p>
        </div>
        <Badge className={STATUS_BADGE[job.job_status] ?? ""}>
          {STATUS_LABEL[job.job_status] ?? job.job_status}
        </Badge>
      </div>

      <div className="space-y-3 px-5 py-5 text-sm">
        <p className="flex items-center gap-2 text-foreground">
          <User className="size-4 shrink-0 text-brass" /> {job.customer_name}
        </p>
        {job.customer_phone && (
          <a
            href={`tel:${job.customer_phone}`}
            className="flex min-h-11 items-center gap-2 text-foreground underline-offset-4 hover:underline"
          >
            <Phone className="size-4 shrink-0 text-brass" /> {job.customer_phone}
          </a>
        )}
        <p className="flex items-start gap-2 text-foreground">
          <MapPin className="size-4 shrink-0 text-brass" />
          <span>
            {job.district}
            {job.address ? ` · ${job.address}` : ""}
          </span>
        </p>
        {(job.scheduled_date || job.time_slot) && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="size-4 shrink-0 text-brass" />
            {job.scheduled_date ?? "Unscheduled"}
            {job.time_slot ? ` · ${job.time_slot}` : ""}
          </p>
        )}
        <p className="leading-relaxed text-muted-foreground">{job.description}</p>
        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.16em] text-brass"
          >
            <Navigation className="size-4" /> Navigate to customer
          </a>
        )}
      </div>

      <div className="space-y-3 px-5 pb-5">
        {job.job_status === "Assigned" && (
          <>
            {bigButton("accept", <CheckCircle2 />, "Accept Job")}
            <Button
              variant="outline"
              className="h-12 w-full active:scale-[0.98]"
              disabled={pending}
              onClick={() => setConfirming("reject")}
            >
              <XCircle /> Decline
            </Button>
          </>
        )}
        {job.job_status === "Accepted" && bigButton("On The Way", <Navigation />, "On My Way")}
        {job.job_status === "On The Way" &&
          bigButton("In Progress", <PlayCircle />, "Start Service")}
        {job.job_status === "In Progress" &&
          bigButton("Completed", <CheckCircle2 />, "Complete Service")}
        {job.job_status === "Completed" && (
          <p className="flex items-center justify-center gap-2 rounded-sm bg-emerald-600/10 py-4 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" /> Completed
          </p>
        )}
        {job.job_status === "Cancelled" && (
          <p className="flex items-center justify-center gap-2 rounded-sm bg-destructive/10 py-4 text-sm text-destructive">
            <XCircle className="size-4" /> Cancelled by customer
          </p>
        )}
        {["Pending", "Confirmed"].includes(job.job_status) && (
          <p className="flex items-center justify-center gap-2 rounded-sm bg-muted py-4 text-sm text-muted-foreground">
            <Clock className="size-4" /> Awaiting dispatch
          </p>
        )}

        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-border/70 text-xs uppercase tracking-[0.18em] text-muted-foreground active:scale-[0.98]"
        >
          <History className="size-4 text-brass" />
          {showHistory ? "Hide history" : "Status history"}
        </button>
        {showHistory && (
          <div className="rounded-sm bg-muted/40 p-4">
            <TicketHistory ticketId={job.ticket_id} />
          </div>
        )}
      </div>

      <AlertDialog open={confirming !== null} onOpenChange={(o) => !o && setConfirming(null)}>
        <AlertDialogContent>
          {confirming && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirmCopy[confirming].title}</AlertDialogTitle>
                <AlertDialogDescription>{confirmCopy[confirming].body}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Back</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onAction(confirming);
                    setConfirming(null);
                  }}
                >
                  {confirmCopy[confirming].cta}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
