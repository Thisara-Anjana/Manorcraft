import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, HardHat } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { resolvePortalHome } from "@/lib/auth-routing";
import { friendlyAuthError } from "@/lib/auth-errors";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { DemoAccess } from "@/components/auth/DemoAccess";
import { ForgotPasswordDialog } from "@/components/auth/ForgotPasswordDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/technician-login")({
  head: () => ({
    meta: [
      { title: "Technician Login | Manorcraft Professional Portal" },
      {
        name: "description",
        content:
          "Manorcraft professionals sign in here to accept jobs, update service progress and track earnings on the move.",
      },
      { property: "og:title", content: "Technician Login | Manorcraft Professional Portal" },
      {
        property: "og:description",
        content: "Manage your jobs, serve customers and grow your business with Manorcraft.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TechnicianLogin,
});

const REMEMBER_KEY = "manorcraft:remembered-tech-email";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(255),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

function TechnicianLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = window.localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setForm((f) => ({ ...f, email: saved }));
      setRemember(true);
    }
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
    if (remember) window.localStorage.setItem(REMEMBER_KEY, form.email.trim());
    else window.localStorage.removeItem(REMEMBER_KEY);

    const home = await resolvePortalHome();
    setLoading(false);
    if (home === "/dashboard") {
      toast.info("This account isn't registered as a technician yet", {
        description: "Taking you to your customer dashboard instead.",
      });
    }
    navigate({ to: home, replace: true });
  };

  return (
    <AuthLayout
      eyebrow="Professional Portal"
      asideTitle="Your workday, organised."
      asideBody="Accept jobs, navigate to customers and update progress from the field — all from one screen built for speed."
      asideFooter="Fair pay · Verified clients · Island-wide work"
    >
      <span className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.28em] text-muted-foreground">
        <HardHat className="size-4 text-brass" /> Field Portal
      </span>
      <h1 className="mt-3 font-display text-4xl font-light text-foreground">Welcome, Professional</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Manage your jobs. Serve customers. Grow your business.
      </p>

      <form onSubmit={submit} className="mt-9 space-y-5">
        <div className="space-y-2">
          <Label
            htmlFor="tech-email"
            className="text-xs uppercase tracking-[0.16em] text-muted-foreground"
          >
            Email
          </Label>
          <Input
            id="tech-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className="h-12 text-base"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@manorcraft.lk"
          />
          {errors["email"] && <p className="text-xs text-destructive">{errors["email"]}</p>}
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="tech-password"
            className="text-xs uppercase tracking-[0.16em] text-muted-foreground"
          >
            Password
          </Label>
          <Input
            id="tech-password"
            type="password"
            autoComplete="current-password"
            className="h-12 text-base"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
          />
          {errors["password"] && <p className="text-xs text-destructive">{errors["password"]}</p>}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <Checkbox
              checked={remember}
              onCheckedChange={(v) => setRemember(v === true)}
              aria-label="Remember me"
            />
            Remember me
          </label>
          <ForgotPasswordDialog defaultEmail={form.email} />
        </div>

        {errors["form"] && (
          <p className="rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {errors["form"]}
          </p>
        )}

        <Button
          type="submit"
          variant="brass"
          size="xl"
          className="h-14 w-full text-base"
          disabled={loading}
        >
          {loading && <Loader2 className="animate-spin" />} Sign In
        </Button>
        <Button asChild variant="outlineBrass" size="xl" className="w-full">
          <Link to="/technician-apply">Apply as a Technician</Link>
        </Button>
      </form>

      <DemoAccess
        roles={["technician"]}
        onPick={(email, password) => {
          setForm({ email, password });
          setErrors({});
        }}
      />

      <div className="mt-8 rounded-sm border border-border bg-secondary/40 p-5 text-center">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Looking for a service?
        </p>
        <Button asChild variant="ghost" className="mt-2 w-full">
          <Link to="/auth">Customer Login →</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
