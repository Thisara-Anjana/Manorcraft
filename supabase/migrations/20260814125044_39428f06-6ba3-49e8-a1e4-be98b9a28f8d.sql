CREATE TABLE public.job_tickets_history (
  history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.job_tickets(ticket_id) ON DELETE CASCADE,
  old_status public.job_status,
  new_status public.job_status NOT NULL,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_tickets_history_ticket ON public.job_tickets_history(ticket_id, created_at DESC);

GRANT SELECT ON public.job_tickets_history TO authenticated;
GRANT ALL ON public.job_tickets_history TO service_role;

ALTER TABLE public.job_tickets_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View history for accessible tickets"
ON public.job_tickets_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.job_tickets t
    WHERE t.ticket_id = job_tickets_history.ticket_id
      AND (t.customer_id = auth.uid() OR t.technician_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
);

CREATE OR REPLACE FUNCTION public.log_job_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  if tg_op = 'INSERT' then
    insert into public.job_tickets_history (ticket_id, old_status, new_status, changed_by)
    values (new.ticket_id, null, new.job_status, auth.uid());
  elsif new.job_status is distinct from old.job_status then
    insert into public.job_tickets_history (ticket_id, old_status, new_status, changed_by)
    values (new.ticket_id, old.job_status, new.job_status, auth.uid());
  end if;
  return new;
end;
$$;

CREATE TRIGGER trg_job_tickets_status_history
AFTER INSERT OR UPDATE OF job_status ON public.job_tickets
FOR EACH ROW EXECUTE FUNCTION public.log_job_status_change();

INSERT INTO public.job_tickets_history (ticket_id, old_status, new_status, changed_by, created_at)
SELECT ticket_id, NULL, job_status, customer_id, created_at FROM public.job_tickets;