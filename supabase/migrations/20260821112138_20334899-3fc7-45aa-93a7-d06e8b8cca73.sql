ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'Confirmed' AFTER 'Pending';
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'Accepted' AFTER 'Assigned';
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'On The Way' AFTER 'Accepted';
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'Cancelled' AFTER 'Completed';

CREATE SEQUENCE IF NOT EXISTS public.booking_code_seq START WITH 1024;
GRANT USAGE, SELECT ON SEQUENCE public.booking_code_seq TO authenticated, service_role;

ALTER TABLE public.job_tickets
  ADD COLUMN IF NOT EXISTS booking_code text NOT NULL DEFAULT ('MC-' || nextval('public.booking_code_seq')),
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS reschedule_count integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS job_tickets_booking_code_key ON public.job_tickets (booking_code);
CREATE INDEX IF NOT EXISTS job_tickets_customer_idx ON public.job_tickets (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS job_tickets_technician_idx ON public.job_tickets (technician_id, created_at DESC);
CREATE INDEX IF NOT EXISTS job_tickets_status_idx ON public.job_tickets (job_status);
CREATE INDEX IF NOT EXISTS job_tickets_history_ticket_idx ON public.job_tickets_history (ticket_id, created_at);

ALTER TABLE public.job_tickets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_tickets;