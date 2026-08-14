import { useState } from "react";
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
  PlayCircle,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TicketHistory } from "@/components/TicketHistory";
import { checkIsTechnician, listMyJobs, updateJobStatus } from "@/lib/technician.functions";

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
  customer_name: string;
  district: string;
  address: string | null;
  job_category: string;
  job_status: string;
  description: string;
  scheduled_date: string | null;
  time_slot: string | null;
};

const statusStyles: Record<string, string> = {
  Pending: "border-transparent bg-muted text-muted-foreground",
  Assigned: "border-brass/50 bg-brass/15 text-accent-foreground",
  "In Progress": "border-transparent bg-primary text-primary-foreground",
  Completed: "border-transparent bg-emerald-600/15 text-emerald-700",
};

function TechnicianPortal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const check = useServerFn(checkIsTechnician);
  const fetchJobs = useServerFn(listMyJobs);
  const setStatus = useServerFn(updateJobStatus);

  const access = useQuery({ queryKey: ["is-technician"], queryFn: () => check({}) });
  const jobs = useQuery({
    queryKey: ["my-jobs"],
    queryFn: () => fetchJobs({}) as Promise<Job[]>,
    enabled: !!access.data?.isTechnician,
  });

  const mutation = useMutation({
    mutationFn: (vars: { ticketId: string; status: "In Progress" | "Completed" }) =>
      setStatus({ data: vars }),
    onSuccess: (_res, vars) => {
      toast.success(vars.status === "Completed" ? "Job completed" : "Job started");
      queryClient.invalidateQueries({ queryKey: ["my-jobs"] });
    },
    onError: (error: Error) => toast.error("Could not update job", { description: error.message }),
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/technician-login", replace: true });
  };

  const list = jobs.data ?? [];
  const active = list.filter((j) => j.job_status !== "Completed");
  const done = list.filter((j) => j.job_status === "Completed");

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
          <p className="text-sm text-muted-foreground">Checking your field credentials…</p>
        ) : !access.data?.isTechnician ? (
          <div className="rounded-sm border border-border/70 bg-background p-8 text-center">
            <h1 className="font-display text-2xl">Field access only</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This portal is reserved for Manorcraft technicians. Ask a branch manager to register
              your account as a technician.
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
              {active.length} active {active.length === 1 ? "job" : "jobs"} · {done.length} completed
            </p>

            {jobs.isPending ? (
              <p className="mt-8 text-sm text-muted-foreground">Loading your jobs…</p>
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
                    onUpdate={(status) => mutation.mutate({ ticketId: job.ticket_id, status })}
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

function JobCard({
  job,
  pending,
  onUpdate,
}: {
  job: Job;
  pending: boolean;
  onUpdate: (status: "In Progress" | "Completed") => void;
}) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <article className="overflow-hidden rounded-sm border border-border/70 bg-background shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-secondary/40 px-5 py-4">
        <div>
          <p className="font-display text-xl leading-tight text-foreground">{job.job_category}</p>
          <p className="mt-1 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
            #{job.ticket_id.slice(0, 8)}
          </p>
        </div>
        <Badge className={statusStyles[job.job_status] ?? ""}>{job.job_status}</Badge>
      </div>

      <div className="space-y-3 px-5 py-5 text-sm">
        <p className="flex items-center gap-2 text-foreground">
          <User className="size-4 shrink-0 text-brass" /> {job.customer_name}
        </p>
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
      </div>

      <div className="px-5 pb-5">
        {job.job_status === "Assigned" && (
          <Button
            variant="brass"
            className="h-14 w-full text-base active:scale-[0.98]"
            disabled={pending}
            onClick={() => onUpdate("In Progress")}
          >
            {pending ? <Loader2 className="animate-spin" /> : <PlayCircle />} Start Job
          </Button>
        )}
        {job.job_status === "In Progress" && (
          <Button
            variant="brass"
            className="h-14 w-full text-base active:scale-[0.98]"
            disabled={pending}
            onClick={() => onUpdate("Completed")}
          >
            {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Mark Completed
          </Button>
        )}
        {job.job_status === "Completed" && (
          <p className="flex items-center justify-center gap-2 rounded-sm bg-emerald-600/10 py-4 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" /> Completed
          </p>
        )}
        {job.job_status === "Pending" && (
          <p className="flex items-center justify-center gap-2 rounded-sm bg-muted py-4 text-sm text-muted-foreground">
            <Clock className="size-4" /> Awaiting dispatch
          </p>
        )}

        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-border/70 text-xs uppercase tracking-[0.18em] text-muted-foreground active:scale-[0.98]"
        >
          <History className="size-4 text-brass" />
          {showHistory ? "Hide history" : "Status history"}
        </button>
        {showHistory && (
          <div className="mt-4 rounded-sm bg-muted/40 p-4">
            <TicketHistory ticketId={job.ticket_id} />
          </div>
        )}
      </div>
    </article>
  );
}
