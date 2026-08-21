import { supabase } from "@/integrations/supabase/client";

export type PortalHome = "/admin" | "/technician" | "/dashboard";

/**
 * Resolves where a freshly signed-in user belongs. Role data is read through
 * RLS (users may only read their own roles), so this cannot be spoofed into
 * granting access — the portals themselves re-check on the server.
 */
export async function resolvePortalHome(): Promise<PortalHome> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/dashboard";

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const list = (roles ?? []).map((r) => r.role as string);
  if (list.includes("ADMIN")) return "/admin";
  if (list.includes("TECHNICIAN")) return "/technician";
  return "/dashboard";
}
