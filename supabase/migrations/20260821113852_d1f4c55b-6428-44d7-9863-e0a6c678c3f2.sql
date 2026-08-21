CREATE TABLE public.services (
  service_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category job_category NOT NULL,
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  common_problems text[] NOT NULL DEFAULT '{}',
  starting_price numeric(10,2) NOT NULL DEFAULT 0,
  hourly_rate numeric(10,2) NOT NULL DEFAULT 0,
  estimated_duration_minutes integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active services are publicly viewable"
  ON public.services FOR SELECT TO anon, authenticated
  USING (is_active OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert services"
  ON public.services FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update services"
  ON public.services FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete services"
  ON public.services FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.reviews (
  review_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL UNIQUE REFERENCES public.job_tickets(ticket_id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reviews_technician_id_idx ON public.reviews (technician_id);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are publicly viewable"
  ON public.reviews FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Customers review own completed bookings"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = customer_id
    AND EXISTS (
      SELECT 1 FROM public.job_tickets t
      WHERE t.ticket_id = reviews.ticket_id
        AND t.customer_id = auth.uid()
        AND t.job_status = 'Completed'::job_status
    )
  );

CREATE POLICY "Customers update own reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers or admins delete reviews"
  ON public.reviews FOR DELETE TO authenticated
  USING (auth.uid() = customer_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.services (slug, name, category, tagline, description, common_problems, starting_price, hourly_rate, estimated_duration_minutes, display_order) VALUES
('plumbing', 'Plumbing', 'Plumbing', 'Expert plumbing solutions for your home.', 'Leak diagnostics, pipe restoration and fixture installation handled with precision by licensed plumbers.', ARRAY['Leaking taps and pipes','Blocked drains','Water heater faults','Toilet and cistern repairs'], 2500, 1800, 90, 1),
('electrical', 'Electrical', 'Electrical', 'Certified electricians for safe, refined interiors.', 'Wiring, panel upgrades and lighting design carried out to national safety standards.', ARRAY['Power trips and short circuits','Faulty switches and sockets','Lighting installation','Distribution board upgrades'], 3000, 2200, 90, 2),
('masonry', 'Masonry', 'Masonry', 'Heritage-standard stonework and structural repair.', 'Plastering, tiling and structural masonry finished with meticulous craftsmanship.', ARRAY['Wall cracks','Damaged plaster','Tile replacement','Boundary and garden walls'], 4000, 2000, 180, 3),
('ac-repair', 'AC Repair', 'AC Repair', 'Keep every room perfectly cool.', 'Servicing, gas refills and new installations for split and inverter air conditioners.', ARRAY['Poor cooling','Gas refill','Water leaking from unit','New AC installation'], 4500, 2500, 120, 4);