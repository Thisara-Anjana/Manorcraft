import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export type ServiceSummary = {
  service_id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
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
  reviewer_name: string;
};

export type ServiceDetail = ServiceSummary & {
  reviews: ServiceReview[];
  available_professionals: {
    profile_id: string;
    full_name: string;
    specialization: string;
    rating: number;
    completed_jobs: number;
  }[];
};

/** Publishable-key client for public, RLS-respecting reads from server functions. */
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

type RatingBucket = { total: number; count: number };

async function ratingsBySlug(
  supabase: ReturnType<typeof publicClient>,
): Promise<Map<string, RatingBucket>> {
  const { data } = await supabase.from("service_reviews").select("service_slug, rating");
  const map = new Map<string, RatingBucket>();
  for (const row of (data ?? []) as unknown as { service_slug: string; rating: number }[]) {
    const bucket = map.get(row.service_slug) ?? { total: 0, count: 0 };
    bucket.total += row.rating;
    bucket.count += 1;
    map.set(row.service_slug, bucket);
  }
  return map;
}

function withRating(row: Record<string, unknown>, ratings: Map<string, RatingBucket>): ServiceSummary {
  const bucket = ratings.get(String(row["slug"]));
  return {
    service_id: String(row["id"]),
    slug: String(row["slug"]),
    name: String(row["name"]),
    category: String(row["category"]),
    description: String(row["description"] ?? ""),
    starting_price: Number(row["starting_price"] ?? 0),
    hourly_rate: Number(row["hourly_rate"] ?? 0),
    estimated_duration_minutes: Number(row["estimated_duration"] ?? 60),
    rating: bucket && bucket.count > 0 ? Number((bucket.total / bucket.count).toFixed(1)) : null,
    review_count: bucket?.count ?? 0,
  };
}

export async function fetchServices(): Promise<ServiceSummary[]> {
  const supabase = publicClient();
  const [{ data, error }, ratings] = await Promise.all([
    supabase.from("services").select("*").eq("active", true).order("display_order"),
    ratingsBySlug(supabase),
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
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error("We couldn't load this service. Please try again.");
  if (!data) return null;

  const ratings = await ratingsBySlug(supabase);
  const summary = withRating(data as Record<string, unknown>, ratings);

  const [{ data: reviewRows }, { data: techRows }] = await Promise.all([
    supabase
      .from("service_reviews")
      .select("review_id, rating, comment, created_at, reviewer_name")
      .eq("service_slug", slug)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("public_technicians")
      .select("profile_id, full_name, specialization, rating, completed_jobs")
      .eq("specialization", summary.category)
      .limit(6),
  ]);

  return {
    ...summary,
    reviews: ((reviewRows ?? []) as unknown as ServiceReview[]).map((r) => ({
      review_id: r.review_id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      reviewer_name: r.reviewer_name,
    })),
    available_professionals: ((techRows ?? []) as unknown as ServiceDetail["available_professionals"]).map(
      (t) => ({ ...t, rating: Number(t.rating ?? 0) }),
    ),
  };
}
