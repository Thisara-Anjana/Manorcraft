import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type Ctx = { supabase: SupabaseClient<Database>; userId: string };

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin access required");
}

export type ManagedUser = {
  userId: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  createdAt: string;
  roles: string[];
};

export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedUser[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersError) throw new Error(usersError.message);

    const [{ data: roles }, { data: customers }, { data: technicians }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("customers").select("customer_id, full_name, phone_number"),
      supabaseAdmin.from("technicians").select("technician_id, full_name"),
    ]);

    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role as string]);
    }
    const customerMap = new Map((customers ?? []).map((c) => [c.customer_id, c] as const));
    const techMap = new Map((technicians ?? []).map((t) => [t.technician_id, t] as const));

    return (usersData.users ?? [])
      .map((u) => ({
        userId: u.id,
        email: u.email ?? "",
        fullName: customerMap.get(u.id)?.full_name ?? techMap.get(u.id)?.full_name ?? null,
        phone: customerMap.get(u.id)?.phone_number ?? null,
        createdAt: u.created_at,
        roles: (roleMap.get(u.id) ?? []).sort(),
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  });

const userIdInput = (data: unknown) => z.object({ userId: z.string().uuid() }).parse(data);

export const grantAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(userIdInput)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(userIdInput)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("You cannot revoke your own admin access");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCurrentUserId = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ userId: context.userId }));
