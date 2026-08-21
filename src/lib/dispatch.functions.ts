import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { OPEN_STATUSES } from "@/lib/booking-status";

type Ctx = { supabase: SupabaseClient<Database>; userId: string };

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "ADMIN")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin access required");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "ADMIN")
      .maybeSingle();
    return { isAdmin: !!data };
  });

export type AdminBooking = {
  id: string;
  booking_number: string;
  status: string;
  address: string;
  problem_description: string;
  scheduled_date: string;
  scheduled_time: string;
  estimated_price: number;
  final_price: number | null;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  technician_id: string | null;
  technician_name: string | null;
  service_name: string;
  service_category: string;
  district_name: string;
  city_name: string;
};

const ADMIN_SELECT = `
  id, booking_number, status, address, problem_description, scheduled_date, scheduled_time,
  estimated_price, final_price, created_at, latitude, longitude, customer_id, technician_id,
  services ( name, category ),
  districts ( name ),
  cities ( name ),
  customer:profiles!bookings_customer_id_fkey ( full_name, phone ),
  technician:profiles!bookings_technician_id_fkey ( full_name )
`;

type AdminJoin = {
  services: { name: string; category: string } | null;
  districts: { name: string } | null;
  cities: { name: string } | null;
  customer: { full_name: string; phone: string | null } | null;
  technician: { full_name: string } | null;
};

function shape(row: Record<string, unknown> & AdminJoin): AdminBooking {
  return {
    id: row["id"] as string,
    booking_number: row["booking_number"] as string,
    status: row["status"] as string,
    address: row["address"] as string,
    problem_description: row["problem_description"] as string,
    scheduled_date: row["scheduled_date"] as string,
    scheduled_time: row["scheduled_time"] as string,
    estimated_price: Number(row["estimated_price"] ?? 0),
    final_price: row["final_price"] === null ? null : Number(row["final_price"]),
    created_at: row["created_at"] as string,
    latitude: row["latitude"] === null ? null : Number(row["latitude"]),
    longitude: row["longitude"] === null ? null : Number(row["longitude"]),
    customer_id: row["customer_id"] as string,
    customer_name: row.customer?.full_name ?? "Manorcraft client",
    customer_phone: row.customer?.phone ?? null,
    technician_id: (row["technician_id"] as string | null) ?? null,
    technician_name: row.technician?.full_name ?? null,
    service_name: row.services?.name ?? "Service",
    service_category: row.services?.category ?? "",
    district_name: row.districts?.name ?? "",
    city_name: row.cities?.name ?? "",
  };
}

export const listBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminBooking[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("bookings")
      .select(ADMIN_SELECT)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => shape(r as never));
  });

export const listMapBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminBooking[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("bookings")
      .select(ADMIN_SELECT)
      .in("status", [...OPEN_STATUSES])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => shape(r as never));
  });

export type AdminTechnician = {
  id: string;
  full_name: string;
  phone: string | null;
  specialization: string;
  experience_years: number;
  rating: number;
  completed_jobs: number;
  availability: boolean;
  verification_status: string;
  district_name: string | null;
  active_jobs: number;
};

export const listTechnicians = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminTechnician[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("technician_profiles")
      .select(
        `profile_id, specialization, experience_years, rating, completed_jobs, availability,
         verification_status,
         profiles!technician_profiles_profile_id_fkey ( full_name, phone, districts ( name ) )`,
      )
      .order("specialization");
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as {
      profile_id: string;
      specialization: string;
      experience_years: number;
      rating: number;
      completed_jobs: number;
      availability: boolean;
      verification_status: string;
      profiles: { full_name: string; phone: string | null; districts: { name: string } | null } | null;
    }[];

    const { data: openJobs } = await context.supabase
      .from("bookings")
      .select("technician_id")
      .in("status", [...OPEN_STATUSES])
      .not("technician_id", "is", null);
    const load = new Map<string, number>();
    for (const j of openJobs ?? []) {
      const id = j.technician_id as string;
      load.set(id, (load.get(id) ?? 0) + 1);
    }

    return rows.map((r) => ({
      id: r.profile_id,
      full_name: r.profiles?.full_name ?? "Technician",
      phone: r.profiles?.phone ?? null,
      specialization: r.specialization,
      experience_years: r.experience_years,
      rating: Number(r.rating ?? 0),
      completed_jobs: r.completed_jobs,
      availability: r.availability,
      verification_status: r.verification_status,
      district_name: r.profiles?.districts?.name ?? null,
      active_jobs: load.get(r.profile_id) ?? 0,
    }));
  });

export const assignTechnician = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ bookingId: z.string().uuid(), technicianId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: updated, error } = await context.supabase
      .from("bookings")
      .update({ technician_id: data.technicianId, status: "TECHNICIAN_ASSIGNED" })
      .eq("id", data.bookingId)
      .select("booking_number, customer_id")
      .single();
    if (error) throw new Error("We couldn't assign this technician. Please try again.");

    await context.supabase.from("notifications").insert([
      {
        user_id: data.technicianId,
        title: "New job assigned",
        message: `Booking ${updated.booking_number} has been assigned to you.`,
        type: "JOB",
      },
      {
        user_id: updated.customer_id,
        title: "Technician assigned",
        message: `A technician is on the way to handle ${updated.booking_number}.`,
        type: "BOOKING",
      },
    ]);
    return { ok: true };
  });

/** Admin confirms a new request before dispatch. */
export const confirmBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ bookingId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: updated, error } = await context.supabase
      .from("bookings")
      .update({ status: "CONFIRMED" })
      .eq("id", data.bookingId)
      .eq("status", "PENDING")
      .select("booking_number, customer_id")
      .maybeSingle();
    if (error) throw new Error("We couldn't confirm this booking. Please try again.");
    if (updated) {
      await context.supabase.from("notifications").insert({
        user_id: updated.customer_id,
        title: "Booking confirmed",
        message: `Your booking ${updated.booking_number} has been confirmed.`,
        type: "BOOKING",
      });
    }
    return { ok: true };
  });

export type AdminAnalytics = {
  metrics: {
    totalCustomers: number;
    totalTechnicians: number;
    availableTechnicians: number;
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    pendingBookings: number;
    completedToday: number;
    totalRevenue: number;
    averageRating: number;
  };
  bookingsByDay: { day: string; count: number }[];
  bookingsByDistrict: { district: string; count: number }[];
  bookingsByService: { service: string; count: number }[];
  revenueByService: { service: string; revenue: number }[];
  technicianPerformance: { name: string; completed: number; rating: number }[];
  recent: AdminBooking[];
};

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminAnalytics> => {
    await assertAdmin(context);

    const [bookingsRes, techsRes, custRes, reviewsRes] = await Promise.all([
      context.supabase
        .from("bookings")
        .select(ADMIN_SELECT)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("technician_profiles")
        .select(
          "profile_id, availability, completed_jobs, rating, profiles!technician_profiles_profile_id_fkey ( full_name )",
        ),
      context.supabase.from("user_roles").select("user_id").eq("role", "CUSTOMER"),
      context.supabase.from("reviews").select("rating"),
    ]);
    if (bookingsRes.error) throw new Error(bookingsRes.error.message);

    const bookings = (bookingsRes.data ?? []).map((r) => shape(r as never));
    const techs = (techsRes.data ?? []) as unknown as {
      profile_id: string;
      availability: boolean;
      completed_jobs: number;
      rating: number;
      profiles: { full_name: string } | null;
    }[];
    const reviews = reviewsRes.data ?? [];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const open = (s: string) => (OPEN_STATUSES as readonly string[]).includes(s);

    const tally = (key: (b: AdminBooking) => string) => {
      const m = new Map<string, number>();
      for (const b of bookings) m.set(key(b), (m.get(key(b)) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };

    const days: { day: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        day: key,
        count: bookings.filter((b) => b.created_at.slice(0, 10) === key).length,
      });
    }

    const revenueMap = new Map<string, number>();
    for (const b of bookings) {
      if (b.status !== "COMPLETED") continue;
      const value = b.final_price ?? b.estimated_price;
      revenueMap.set(b.service_name, (revenueMap.get(b.service_name) ?? 0) + value);
    }

    return {
      metrics: {
        totalCustomers: (custRes.data ?? []).length,
        totalTechnicians: techs.length,
        availableTechnicians: techs.filter((t) => t.availability).length,
        totalBookings: bookings.length,
        activeBookings: bookings.filter((b) => open(b.status)).length,
        completedBookings: bookings.filter((b) => b.status === "COMPLETED").length,
        cancelledBookings: bookings.filter((b) => b.status === "CANCELLED").length,
        pendingBookings: bookings.filter((b) => b.status === "PENDING").length,
        completedToday: bookings.filter(
          (b) => b.status === "COMPLETED" && new Date(b.created_at) >= startOfToday,
        ).length,
        totalRevenue: bookings
          .filter((b) => b.status === "COMPLETED")
          .reduce((sum, b) => sum + (b.final_price ?? b.estimated_price), 0),
        averageRating: reviews.length
          ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10
          : 0,
      },
      bookingsByDay: days,
      bookingsByDistrict: tally((b) => b.district_name || "Unknown")
        .slice(0, 8)
        .map(([district, count]) => ({ district, count })),
      bookingsByService: tally((b) => b.service_name).map(([service, count]) => ({
        service,
        count,
      })),
      revenueByService: [...revenueMap.entries()].map(([service, revenue]) => ({
        service,
        revenue,
      })),
      technicianPerformance: techs
        .map((t) => ({
          name: t.profiles?.full_name ?? "Technician",
          completed: t.completed_jobs,
          rating: Number(t.rating ?? 0),
        }))
        .sort((a, b) => b.completed - a.completed),
      recent: bookings.slice(0, 6),
    };
  });

export type AdminCustomer = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  district_name: string | null;
  city_name: string | null;
  bookings: number;
  created_at: string;
};

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminCustomer[]> => {
    await assertAdmin(context);
    const { data: roleRows } = await context.supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "CUSTOMER");
    const ids = (roleRows ?? []).map((r) => r.user_id);
    if (ids.length === 0) return [];

    const [{ data: profiles }, { data: bookings }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, full_name, email, phone, created_at, districts ( name ), cities ( name )")
        .in("id", ids),
      context.supabase.from("bookings").select("customer_id"),
    ]);

    const counts = new Map<string, number>();
    for (const b of bookings ?? []) {
      counts.set(b.customer_id, (counts.get(b.customer_id) ?? 0) + 1);
    }

    return ((profiles ?? []) as unknown as {
      id: string;
      full_name: string;
      email: string | null;
      phone: string | null;
      created_at: string;
      districts: { name: string } | null;
      cities: { name: string } | null;
    }[]).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      district_name: p.districts?.name ?? null,
      city_name: p.cities?.name ?? null,
      bookings: counts.get(p.id) ?? 0,
      created_at: p.created_at,
    }));
  });

export type AdminService = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  starting_price: number;
  hourly_rate: number;
  estimated_duration: number;
  active: boolean;
};

export const listAllServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminService[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("services")
      .select(
        "id, slug, name, description, category, starting_price, hourly_rate, estimated_duration, active",
      )
      .order("display_order");
    if (error) throw new Error(error.message);
    return (data ?? []).map((s) => ({
      ...s,
      starting_price: Number(s.starting_price),
      hourly_rate: Number(s.hourly_rate),
    }));
  });

export const saveService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        startingPrice: z.number().min(0),
        hourlyRate: z.number().min(0),
        estimatedDuration: z.number().int().min(15).max(600),
        description: z.string().trim().max(1000),
        active: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("services")
      .update({
        starting_price: data.startingPrice,
        hourly_rate: data.hourlyRate,
        estimated_duration: data.estimatedDuration,
        description: data.description,
        active: data.active,
      })
      .eq("id", data.id);
    if (error) throw new Error("We couldn't save this service. Please try again.");
    return { ok: true };
  });
