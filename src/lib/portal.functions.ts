import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canCustomerCancel, canCustomerReschedule } from "@/lib/booking-status";

export const getPortalAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (data ?? []).map((r) => r.role as string);
    return {
      isAdmin: roles.includes("ADMIN"),
      isTechnician: roles.includes("TECHNICIAN"),
      isCustomer: roles.includes("CUSTOMER"),
      roles,
    };
  });

export type CustomerBooking = {
  id: string;
  booking_number: string;
  status: string;
  address: string;
  problem_description: string;
  scheduled_date: string;
  scheduled_time: string;
  estimated_price: number;
  final_price: number | null;
  cancellation_reason: string | null;
  reschedule_count: number;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  service_name: string;
  service_category: string;
  district_name: string;
  city_name: string;
  technician_id: string | null;
  technician_name: string | null;
  technician_phone: string | null;
  technician_specialization: string | null;
  has_review: boolean;
};

const BOOKING_SELECT = `
  id, booking_number, status, address, problem_description, scheduled_date, scheduled_time,
  estimated_price, final_price, cancellation_reason, reschedule_count, created_at,
  latitude, longitude, technician_id,
  services ( name, category ),
  districts ( name ),
  cities ( name ),
  technician:profiles!bookings_technician_id_fkey ( full_name, phone ),
  reviews ( id )
`;

type BookingJoin = {
  services: { name: string; category: string } | null;
  districts: { name: string } | null;
  cities: { name: string } | null;
  technician: { full_name: string; phone: string | null } | null;
  reviews: { id: string }[] | null;
};

function shapeBooking(row: Record<string, unknown> & BookingJoin): CustomerBooking {
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
    cancellation_reason: (row["cancellation_reason"] as string | null) ?? null,
    reschedule_count: Number(row["reschedule_count"] ?? 0),
    created_at: row["created_at"] as string,
    latitude: row["latitude"] === null ? null : Number(row["latitude"]),
    longitude: row["longitude"] === null ? null : Number(row["longitude"]),
    service_name: row.services?.name ?? "Service",
    service_category: row.services?.category ?? "",
    district_name: row.districts?.name ?? "",
    city_name: row.cities?.name ?? "",
    technician_id: (row["technician_id"] as string | null) ?? null,
    technician_name: row.technician?.full_name ?? null,
    technician_phone: row.technician?.phone ?? null,
    technician_specialization: null,
    has_review: (row.reviews ?? []).length > 0,
  };
}

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CustomerBooking[]> => {
    const { data, error } = await context.supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("customer_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("We couldn't load your bookings. Please try again.");
    return (data ?? []).map((r) => shapeBooking(r as never));
  });

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        serviceId: z.string().uuid(),
        districtId: z.string().uuid(),
        cityId: z.string().uuid(),
        address: z.string().trim().min(6).max(300),
        problemDescription: z.string().trim().min(10).max(1000),
        scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: service, error: sErr } = await context.supabase
      .from("services")
      .select("id, name, starting_price")
      .eq("id", data.serviceId)
      .eq("active", true)
      .maybeSingle();
    if (sErr || !service) throw new Error("That service is not available right now.");

    const { data: city } = await context.supabase
      .from("cities")
      .select("id, district_id")
      .eq("id", data.cityId)
      .maybeSingle();
    if (!city || city.district_id !== data.districtId) {
      throw new Error("Please choose a city that belongs to the selected district.");
    }

    const { data: inserted, error } = await context.supabase
      .from("bookings")
      .insert({
        customer_id: context.userId,
        service_id: data.serviceId,
        district_id: data.districtId,
        city_id: data.cityId,
        address: data.address,
        problem_description: data.problemDescription,
        scheduled_date: data.scheduledDate,
        scheduled_time: data.scheduledTime,
        estimated_price: Number(service.starting_price ?? 0),
        status: "PENDING",
      })
      .select("id, booking_number")
      .single();
    if (error) throw new Error("We couldn't create your booking. Please try again.");

    await context.supabase.from("notifications").insert({
      user_id: context.userId,
      title: "Booking received",
      message: `Your ${service.name} request ${inserted.booking_number} is pending confirmation.`,
      type: "BOOKING",
    });

    return { id: inserted.id, bookingNumber: inserted.booking_number };
  });

/** Customers may cancel while the job has not started yet. */
export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ bookingId: z.string().uuid(), reason: z.string().trim().max(300).optional() })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: booking } = await context.supabase
      .from("bookings")
      .select("id, status")
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId)
      .maybeSingle();
    if (!booking) throw new Error("Booking not found.");
    if (!canCustomerCancel(booking.status)) {
      throw new Error("This booking can no longer be cancelled — please contact us instead.");
    }

    const { error } = await context.supabase
      .from("bookings")
      .update({
        status: "CANCELLED",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: data.reason?.trim() || null,
      })
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId);
    if (error) throw new Error("We couldn't cancel this booking. Please try again.");
    return { ok: true };
  });

/** Customers may move the visit before work begins. */
export const rescheduleBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        bookingId: z.string().uuid(),
        scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
        scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose a time slot."),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: booking } = await context.supabase
      .from("bookings")
      .select("id, status, reschedule_count")
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId)
      .maybeSingle();
    if (!booking) throw new Error("Booking not found.");
    if (!canCustomerReschedule(booking.status)) {
      throw new Error("This booking is already underway and can't be rescheduled.");
    }

    const { error } = await context.supabase
      .from("bookings")
      .update({
        scheduled_date: data.scheduledDate,
        scheduled_time: data.scheduledTime,
        reschedule_count: (booking.reschedule_count ?? 0) + 1,
      })
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId);
    if (error) throw new Error("We couldn't reschedule this booking. Please try again.");
    return { ok: true };
  });

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        bookingId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(600).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: booking } = await context.supabase
      .from("bookings")
      .select("id, status, technician_id")
      .eq("id", data.bookingId)
      .eq("customer_id", context.userId)
      .maybeSingle();
    if (!booking) throw new Error("Booking not found.");
    if (booking.status !== "COMPLETED") {
      throw new Error("You can review a job once it has been completed.");
    }

    const { error } = await context.supabase.from("reviews").insert({
      booking_id: data.bookingId,
      customer_id: context.userId,
      technician_id: booking.technician_id,
      rating: data.rating,
      comment: data.comment?.trim() || null,
    });
    if (error) throw new Error("We couldn't save your review. Please try again.");

    if (booking.technician_id) {
      const { data: rows } = await context.supabase
        .from("reviews")
        .select("rating")
        .eq("technician_id", booking.technician_id);
      const list = rows ?? [];
      const avg = list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : 0;
      await context.supabase
        .from("technician_profiles")
        .update({ rating: Math.round(avg * 10) / 10 })
        .eq("profile_id", booking.technician_id);
      await context.supabase.from("notifications").insert({
        user_id: booking.technician_id,
        title: "New review received",
        message: `A customer rated your work ${data.rating} out of 5.`,
        type: "REVIEW",
      });
    }
    return { ok: true };
  });

export type MyProfile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  district_id: string | null;
  city_id: string | null;
};

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyProfile | null> => {
    const { data } = await context.supabase
      .from("profiles")
      .select("id, full_name, email, phone, address, district_id, city_id")
      .eq("id", context.userId)
      .maybeSingle();
    return (data as MyProfile) ?? null;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        fullName: z.string().trim().min(2).max(120),
        phone: z.string().trim().max(30).optional(),
        address: z.string().trim().max(300).optional(),
        districtId: z.string().uuid().nullable().optional(),
        cityId: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        district_id: data.districtId ?? null,
        city_id: data.cityId ?? null,
      })
      .eq("id", context.userId);
    if (error) throw new Error("We couldn't save your profile. Please try again.");
    return { ok: true };
  });

export type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
};

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationRow[]> => {
    const { data } = await context.supabase
      .from("notifications")
      .select("id, title, message, type, read, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    return (data ?? []) as NotificationRow[];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ notificationId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await context.supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", data.notificationId)
      .eq("user_id", context.userId);
    return { ok: true };
  });
