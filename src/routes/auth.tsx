import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Customer Login | Manorcraft Home Services" },
      {
        name: "description",
        content:
          "Sign in to your Manorcraft customer account to book verified plumbing, electrical, masonry and AC repair professionals across Sri Lanka.",
      },
      { property: "og:title", content: "Customer Login | Manorcraft Home Services" },
      {
        property: "og:description",
        content: "Premium home services, whenever you need them. Sign in or create an account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerAuthPage,
});

const REMEMBER_KEY = "manorcraft:remembered-email";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(255),
  password: z.string().min(6, "Please enter your password."),
});

function CustomerAuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ email: "", password: "" });

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

  const set = (key: "email" | "password", value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "", form: "" }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse(form);
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
    toast.success("Welcome back to Manorcraft");
    navigate({ to: home, replace: true });
  };

  return (
    <AuthLayout
      eyebrow="Members Entrance"
      asideTitle="Craftsmanship, reserved for your household."
      asideBody="Schedule vetted plumbing, electrical, masonry and AC specialists across Colombo, Kandy and Anuradhapura."
      asideFooter={
        <span className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-brass" /> Insured · Vetted · Discreet
        </span>
      }
    >
      <div>
        <span className="text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground">
          Customer Account
        </span>
        <h1 className="mt-3 font-display text-4xl font-light text-foreground">
          Welcome to Manorcraft
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Premium home services, whenever you need them.
        </p>
      </div>

      <form onSubmit={handleSignIn} className="mt-9 space-y-5">
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          error={errors["email"]}
          placeholder="you@example.com"
          onChange={(v) => set("email", v)}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          error={errors["password"]}
          placeholder="••••••••"
          onChange={(v) => set("password", v)}
        />

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

        <Button type="submit" variant="brass" size="xl" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Sign In
        </Button>
        <Button asChild variant="outlineBrass" size="xl" className="w-full">
          <Link to="/register">Create Account</Link>
        </Button>
      </form>

      <DemoAccess
        roles={["customer"]}
        onPick={(email, password) => {
          setForm({ email, password });
          setErrors({});
        }}
      />

      <div className="mt-8 rounded-sm border border-border bg-secondary/40 p-5 text-center">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Are you a professional?
        </p>
        <Button asChild variant="ghost" className="mt-2 w-full">
          <Link to="/technician-login">Technician Login →</Link>
        </Button>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        <Link to="/" className="uppercase tracking-[0.16em] hover:text-brass">
          Return to Manorcraft
        </Link>
      </p>
    </AuthLayout>
  );
}

function Field({
  id,
  label,
  value,
  error,
  placeholder,
  type = "text",
  autoComplete,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string | undefined;
  placeholder?: string | undefined;
  type?: string | undefined;
  autoComplete?: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        className="h-11"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
