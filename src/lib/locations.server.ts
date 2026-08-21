import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export type DistrictRow = { id: string; name: string; province: string };
export type CityRow = { id: string; name: string; district_id: string };

/** Publishable-key client: districts and cities are public reference data. */
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export async function fetchDistricts(): Promise<DistrictRow[]> {
  const { data, error } = await publicClient()
    .from("districts")
    .select("id, name, province")
    .order("name");
  if (error) throw new Error("We couldn't load districts. Please try again.");
  return data ?? [];
}

export async function fetchCities(districtId: string): Promise<CityRow[]> {
  const { data, error } = await publicClient()
    .from("cities")
    .select("id, name, district_id")
    .eq("district_id", districtId)
    .order("name");
  if (error) throw new Error("We couldn't load cities for that district.");
  return data ?? [];
}
