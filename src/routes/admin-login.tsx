import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { resolvePortalHome } from "@/lib/auth-routing";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ForgotPasswordDialog } from "@/components/auth/ForgotPasswordDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Administration Sign In | Manorcraft" },
      {
        name: "description",
        content: "Restricted Manorcraft administration sign in for branch managers and operations staff.",
      },
      { property: "og:title", content: "Administration Sign In | Manorcraft" },
      {
        property: "og:description",
        content: "Restricted access for Manorcraft operations staff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLogin,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(255),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) navigate({ to: await resolvePortalHome(), replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });
    if (error) {
      setLoading(false);
      setErrors({ form: friendlyAuthError(error, "We couldn't sign you in. Please try again.") });
      return;
    }
    const home = await resolvePortalHome();
    setLoading(false);
    if (home !== "/admin") {
      toast.error("This account does not have administrator access");
    }
    navigate({ to: home, replace: true });
  };


  return (
    <AuthLayout
      eyebrow="Restricted Access"
      asideTitle="Manorcraft Administration."
      asideBody="Dispatch, technician management and service operations for Manorcraft branch managers."
      asideFooter="Authorised personnel only"
    >
      <span className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.28em] text-muted-foreground">
        <Lock className="size-4 text-brass" /> Administration
      </span>
      <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground">
        Manorcraft Admin Portal
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Manage operations, professionals and customers.
      </p>


      <form onSubmit={submit} className="mt-9 space-y-5">
        <div className="space-y-2">
          <Label
            htmlFor="admin-email"
            className="text-xs uppercase tracking-[0.16em] text-muted-foreground"
          >
            Email
          </Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="email"
            className="h-11"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="operations@manorcraft.lk"
          />
          {errors["email"] && <p className="text-xs text-destructive">{errors["email"]}</p>}
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="admin-password"
            className="text-xs uppercase tracking-[0.16em] text-muted-foreground"
          >
            Password
          </Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            className="h-11"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
          />
          {errors["password"] && <p className="text-xs text-destructive">{errors["password"]}</p>}
        </div>
        <div className="flex justify-end">
          <ForgotPasswordDialog defaultEmail={form.email} />
        </div>
        {errors["form"] && (
          <p className="rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {errors["form"]}
          </p>
        )}
        <Button type="submit" variant="brass" size="xl" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Secure Login
        </Button>
      </form>

      <DemoAccess
        roles={["admin"]}
        onPick={(email, password) => {
          setForm({ email, password });
          setErrors({});
        }}
      />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        <Link to="/get-started" className="uppercase tracking-[0.16em] hover:text-brass">
          Not an administrator?
        </Link>
      </p>
    </AuthLayout>
  );
}

