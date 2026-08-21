import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export type ServiceSummary = {
  service_id: string;
  slug: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  common_problems: string[];
  starting_price: number;
  hourly_rate: number;
  estimated_duration_minutes: number;
  rating: number | null;
  review_count: number;
};

export type ServiceReview = {
  review_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type ServiceDetail = ServiceSummary & {
  reviews: ServiceReview[];
  available_professionals: { technician_id: string; full_name: string; current_status: string }[];
};

/** Publishable-key client for public, RLS-respecting reads from server functions. */
function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

type RatingBucket = { total: number; count: number };

async function ratingsByCategory(
  supabase: ReturnType<typeof publicClient>,
): Promise<Map<string, RatingBucket>> {
  const { data } = await supabase.from("reviews").select("rating, job_tickets!inner(job_category)");
  const map = new Map<string, RatingBucket>();
  for (const row of (data ?? []) as unknown as {
    rating: number;
    job_tickets: { job_category: string } | null;
  }[]) {
    const category = row.job_tickets?.job_category;
    if (!category) continue;
    const bucket = map.get(category) ?? { total: 0, count: 0 };
    bucket.total += row.rating;
    bucket.count += 1;
    map.set(category, bucket);
  }
  return map;
}

function withRating(
  row: Record<string, unknown>,
  ratings: Map<string, RatingBucket>,
): ServiceSummary {
  const bucket = ratings.get(String(row["category"]));
  return {
    service_id: String(row["service_id"]),
    slug: String(row["slug"]),
    name: String(row["name"]),
    category: String(row["category"]),
    tagline: String(row["tagline"] ?? ""),
    description: String(row["description"] ?? ""),
    common_problems: (row["common_problems"] as string[] | null) ?? [],
    starting_price: Number(row["starting_price"] ?? 0),
    hourly_rate: Number(row["hourly_rate"] ?? 0),
    estimated_duration_minutes: Number(row["estimated_duration_minutes"] ?? 60),
    rating: bucket && bucket.count > 0 ? Number((bucket.total / bucket.count).toFixed(1)) : null,
    review_count: bucket?.count ?? 0,
  };
}

export async function fetchServices(): Promise<ServiceSummary[]> {
  const supabase = publicClient();
  const [{ data, error }, ratings] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    ratingsByCategory(supabase),
  ]);
  if (error) throw new Error("We couldn't load our services right now. Please try again.");
  return (data ?? []).map((row) => withRating(row as Record<string, unknown>, ratings));
}

export async function fetchServiceDetail(slug: string): Promise<ServiceDetail | null> {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error("We couldn't load this service. Please try again.");
  if (!data) return null;

  const ratings = await ratingsByCategory(supabase);
  const summary = withRating(data as Record<string, unknown>, ratings);

  const [{ data: reviewRows }, { data: techRows }] = await Promise.all([
    supabase
      .from("reviews")
      .select("review_id, rating, comment, created_at, job_tickets!inner(job_category)")
      .eq("job_tickets.job_category", summary.category)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("technicians")
      .select("technician_id, full_name, current_status")
      .eq("primary_skill", summary.category)
      .limit(6),
  ]);

  return {
    ...summary,
    reviews: ((reviewRows ?? []) as unknown as ServiceReview[]).map((r) => ({
      review_id: r.review_id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
    })),
    available_professionals: (techRows ?? []) as ServiceDetail["available_professionals"],
  };
}
