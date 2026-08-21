REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

DROP POLICY IF EXISTS "Active services are publicly viewable" ON public.services;

CREATE POLICY "Active services are publicly viewable"
ON public.services FOR SELECT
TO anon, authenticated
USING (is_active);

CREATE POLICY "Admins view all services"
ON public.services FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));