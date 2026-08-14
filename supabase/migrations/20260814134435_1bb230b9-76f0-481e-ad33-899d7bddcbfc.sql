CREATE TABLE public.brand_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  logo_path text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.brand_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.brand_settings TO authenticated;
GRANT ALL ON public.brand_settings TO service_role;

ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand settings are publicly viewable" ON public.brand_settings FOR SELECT USING (true);
CREATE POLICY "Admins insert brand settings" ON public.brand_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update brand settings" ON public.brand_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_brand_settings_updated_at BEFORE UPDATE ON public.brand_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.brand_settings (id, logo_path) VALUES (true, NULL);

CREATE POLICY "Brand assets are readable" ON storage.objects FOR SELECT USING (bucket_id = 'brand_assets');
CREATE POLICY "Admins upload brand assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'brand_assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update brand assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'brand_assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete brand assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'brand_assets' AND public.has_role(auth.uid(), 'admin'));