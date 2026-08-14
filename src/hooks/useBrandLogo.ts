import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const BRAND_LOGO_QUERY_KEY = ["brand-logo"] as const;

/**
 * Reads the configured company logo and turns its storage path into a
 * temporary signed URL (the brand_assets bucket is private).
 */
export function useBrandLogo() {
  return useQuery({
    queryKey: BRAND_LOGO_QUERY_KEY,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("brand_settings").select("logo_path").maybeSingle();

      const path = data?.logo_path;
      if (!path) return { path: null as string | null, url: null as string | null };

      const signed = await supabase.storage.from("brand_assets").createSignedUrl(path, 60 * 60);

      return { path, url: signed.data?.signedUrl ?? null };
    },
  });
}
