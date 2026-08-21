import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OPEN_STATUSES } from "@/lib/booking-status";

export type TechnicianProfile = {
  profile_id: string;
  full_name: string;
  specialization: string;
  experience_years: number;
  rating: number;
  completed_jobs: number;
  availability: boolean;
  verification_status: string;
  bio: string;
};

export const checkIsTechnician = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("technician_profiles")
      .select(
        `profile_id, specialization, experience_years, rating, completed_jobs, availability,
         verification_status, bio,
         profiles!technician_profiles_profile_id_fkey ( full_name )`,
      )
      .eq("profile_id", context.userId)
      .maybeSingle();

    if (!data) return { isTechnician: false, profile: null as TechnicianProfile | null };
    const row = data as unknown as {
      profile_id: string;
      specialization: string;
      experience_years: number;
      rating: number;
      completed_jobs: number;
      availability: boolean;
      verification_status: string;
      bio: string;
      profiles: { full_name: string } | null;
    };
    return {
      isTechnician: true,
      profile: {
        profile_id: row.profile_id,
        full_name: row.profiles?.full_name ?? "Technician",
        specialization: row.specialization,
        experience_years: row.experience_years,
        rating: Number(row.rating ?? 0),
        completed_jobs: row.completed_jobs,
        availability: row.availability,
        verification_status: row.verification_status,
        bio: row.bio,
      } as TechnicianProfile,
    };
  });

export const setAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ available: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("technician_profiles")
      .update({ availability: data.available })
      .eq("profile_id", context.userId);
    if (error) throw new Error("We couldn't update your availability. Please try again.");
    return { ok: true };
  });

export type TechnicianJob = {
  id: string;
  booking_number: string;
  status: string;
  address: string;
  problem_description: string;
  scheduled_date: string;
  scheduled_time: string;
  estimated_price: number;
  final_price: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  service_name: string;
  service_category: string;
  district_name: string;
  city_name: string;
  customer_name: string;
  customer_phone: string | null;
};

const TECH_SELECT = `
  id, booking_number, status, address, problem_description, scheduled_date, scheduled_time,
  estimated_price, final_price, latitude, longitude, created_at,
  services ( name, category ),
  districts ( name ),
  cities ( name ),
  customer:profiles!bookings_customer_id_fkey ( full_name, phone )
`;

export const listMyJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TechnicianJob[]> => {
    const { data, error } = await context.supabase
      .from("bookings")
      .select(TECH_SELECT)
      .eq("technician_id", context.userId)
      .order("scheduled_date", { ascending: true });
    if (error) throw new Error("We couldn't load your jobs. Please try again.");

    return ((data ?? []) as unknown as (Record<string, unknown> & {
      services: { name: string; category: string } | null;
      districts: { name: string } | null;
      cities: { name: string } | null;
      customer: { full_name: string; phone: string | null } | null;
    })[]).map((r) => ({
      id: r["id"] as string,
      booking_number: r["booking_number"] as string,
      status: r["status"] as string,
      address: r["address"] as string,
      problem_description: r["problem_description"] as string,
      scheduled_date: r["scheduled_date"] as string,
      scheduled_time: r["scheduled_time"] as string,
      estimated_price: Number(r["estimated_price"] ?? 0),
      final_price: r["final_price"] === null ? null : Number(r["final_price"]),
      latitude: r["latitude"] === null ? null : Number(r["latitude"]),
      longitude: r["longitude"] === null ? null : Number(r["longitude"]),
      created_at: r["created_at"] as string,
      service_name: r.services?.name ?? "Service",
      service_category: r.services?.category ?? "",
      district_name: r.districts?.name ?? "",
      city_name: r.cities?.name ?? "",
      customer_name: r.customer?.full_name ?? "Manorcraft client",
      customer_phone: r.customer?.phone ?? null,
    }));
  });

export type TechnicianStats = {
  assigned: number;
  active: number;
  completed: number;
  earnings: number;
  rating: number;
};

export const getTechnicianStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TechnicianStats> => {
    const [{ data: jobs }, { data: profile }] = await Promise.all([
      context.supabase
        .from("bookings")
        .select("status, estimated_price, final_price")
        .eq("technician_id", context.userId),
      context.supabase
        .from("technician_profiles")
        .select("rating")
        .eq("profile_id", context.userId)
        .maybeSingle(),
    ]);
    const list = jobs ?? [];
    const open = (s: string) => (OPEN_STATUSES as readonly string[]).includes(s);
    return {
      assigned: list.filter((j) => j.status === "TECHNICIAN_ASSIGNED").length,
      active: list.filter((j) => open(j.status)).length,
      completed: list.filter((j) => j.status === "COMPLETED").length,
      earnings: list
        .filter((j) => j.status === "COMPLETED")
        .reduce((sum, j) => sum + Number(j.final_price ?? j.estimated_price ?? 0), 0),
      rating: Number(profile?.rating ?? 0),
    };
  });

/** Technician accepts a dispatch assignment. */
export const acceptJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ bookingId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: updated, error } = await context.supabase
      .from("bookings")
      .update({ status: "TECHNICIAN_ACCEPTED" })
      .eq("id", data.bookingId)
      .eq("technician_id", context.userId)
      .eq("status", "TECHNICIAN_ASSIGNED")
      .select("booking_number, customer_id")
      .maybeSingle();
    if (error) throw new Error("We couldn't accept this job. Please try again.");
    if (updated) {
      await context.supabase.from("notifications").insert({
        user_id: updated.customer_id,
        title: "Technician accepted",
        message: `Your technician accepted booking ${updated.booking_number}.`,
        type: "STATUS",
      });
    }
    return { ok: true };
  });

/** Technician declines — the job returns to dispatch unassigned. */
export const rejectJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ bookingId: z.string().uuid(), reason: z.string().trim().max(300).optional() })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("bookings")
      .update({ status: "CONFIRMED", technician_id: null })
      .eq("id", data.bookingId)
      .eq("technician_id", context.userId)
      .eq("status", "TECHNICIAN_ASSIGNED");
    if (error) throw new Error("We couldn't decline this job. Please try again.");
    return { ok: true };
  });

export const updateJobStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        bookingId: z.string().uuid(),
        status: z.enum(["ON_THE_WAY", "SERVICE_STARTED", "COMPLETED"]),
        finalPrice: z.number().min(0).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "COMPLETED" && data.finalPrice !== undefined) {
      patch["final_price"] = data.finalPrice;
    }

    const { data: updated, error } = await context.supabase
      .from("bookings")
      .update(patch)
      .eq("id", data.bookingId)
      .eq("technician_id", context.userId)
      .select("booking_number, customer_id")
      .maybeSingle();
    if (error) throw new Error("We couldn't update this job. Please try again.");

    if (data.status === "COMPLETED") {
      const { count } = await context.supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("technician_id", context.userId)
        .eq("status", "COMPLETED");
      await context.supabase
        .from("technician_profiles")
        .update({ completed_jobs: count ?? 0 })
        .eq("profile_id", context.userId);
    }

    if (updated) {
      const message =
        data.status === "ON_THE_WAY"
          ? `Your technician is on the way for ${updated.booking_number}.`
          : data.status === "SERVICE_STARTED"
            ? `Work has started on ${updated.booking_number}.`
            : `${updated.booking_number} has been completed. Please leave a review.`;
      await context.supabase.from("notifications").insert({
        user_id: updated.customer_id,
        title: "Booking update",
        message,
        type: data.status === "COMPLETED" ? "REVIEW" : "STATUS",
      });
    }
    return { ok: true };
  });

export type AvailabilitySlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  available: boolean;
};

export const listMyAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AvailabilitySlot[]> => {
    const { data } = await context.supabase
      .from("technician_availability")
      .select("id, day_of_week, start_time, end_time, available")
      .eq("technician_id", context.userId)
      .order("day_of_week");
    return (data ?? []) as AvailabilitySlot[];
  });

export const toggleAvailabilityDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ dayOfWeek: z.number().int().min(0).max(6), available: z.boolean() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("technician_availability").upsert(
      {
        technician_id: context.userId,
        day_of_week: data.dayOfWeek,
        available: data.available,
      },
      { onConflict: "technician_id,day_of_week" },
    );
    if (error) throw new Error("We couldn't update your schedule. Please try again.");
    return { ok: true };
  });
