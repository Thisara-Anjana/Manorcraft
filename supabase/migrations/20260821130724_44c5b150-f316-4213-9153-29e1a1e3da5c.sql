DROP POLICY IF EXISTS "Active services are public" ON public.services;

CREATE POLICY "Anon can view active services"
ON public.services FOR SELECT TO anon
USING (active);

CREATE POLICY "Authenticated can view services"
ON public.services FOR SELECT TO authenticated
USING (active OR public.is_admin());