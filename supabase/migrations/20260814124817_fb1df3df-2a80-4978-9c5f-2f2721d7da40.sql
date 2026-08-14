GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

DROP POLICY IF EXISTS "Customers create own tickets" ON public.job_tickets;
CREATE POLICY "Customers create own tickets"
ON public.job_tickets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_tickets TO authenticated;
GRANT ALL ON public.job_tickets TO service_role;