import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LocationSelects } from "@/components/LocationSelects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Your Account | Manorcraft" },
      {
        name: "description",
        content:
          "Create a free Manorcraft customer account to book verified plumbing, electrical, masonry and AC repair professionals across Sri Lanka.",
      },
      { property: "og:title", content: "Create Your Account | Manorcraft" },
      {
        property: "og:description",
        content: "Join Manorcraft and book trusted home professionals in minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your full name.").max(80),
    email: z.string().trim().email("Enter a valid email address.").max(255),
    phone: z
      .string()
      .trim()
      .regex(/^[+0-9 ()-]{7,20}$/, "Enter a valid phone number."),
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string(),
    districtId: z.string().uuid("Please select your district."),
    cityId: z.string().uuid("Please select your city / area."),
    address: z.string().trim().min(6, "Enter your street address.").max(300),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

const EMPTY = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  districtId: "",
  cityId: "",
  address: "",
};

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  const set = (key: keyof typeof EMPTY, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

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
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        // Role is never user-selectable here: the database defaults new
        // sign-ups from this page to CUSTOMER.
        data: {
          full_name: form.fullName.trim(),
          phone: form.phone.trim(),
          district_id: form.districtId,
          city_id: form.cityId,
          address: form.address.trim(),
          role: "CUSTOMER",
        },
      },
    });
    setLoading(false);

    if (error) {
      setErrors({ form: friendlyAuthError(error, "Your account could not be created. Please try again.") });
      return;
    }
    setCreated(form.fullName.trim().split(" ")[0] ?? form.fullName.trim());
    if (!data.session) {
      setErrors({
        form: "Check your inbox to confirm your email address, then sign in.",
      });
    }
  };

  if (created) {
    return (
      <AuthLayout
        eyebrow="Account Created"
        asideTitle="Welcome to the household register."
        asideBody="Your Manorcraft account is ready. Book verified professionals across Colombo, Kandy and beyond."
        asideFooter="Insured · Vetted · Discreet"
      >
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-brass/50 text-brass">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <h1 className="mt-8 font-display text-4xl font-light text-foreground">
            Welcome to Manorcraft, {created}!
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your account has been created successfully.
          </p>
          <Button
            variant="brass"
            size="xl"
            className="mt-9 w-full"
            onClick={() => navigate({ to: "/dashboard", replace: true })}
          >
            Go to Dashboard
          </Button>
          <Button asChild variant="ghost" className="mt-3 w-full">
            <Link to="/auth">Back to sign in</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="New Members"
      asideTitle="Craftsmanship, reserved for your household."
      asideBody="Tell us where you live and we'll match you with vetted professionals close by."
      asideFooter={
        <span className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-brass" /> Insured · Vetted · Discreet
        </span>
      }
    >
      <span className="text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground">
        Customer Account
      </span>
      <h1 className="mt-3 font-display text-4xl font-light text-foreground">Create your account</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        A few details and your household is on the books.
      </p>

      <form onSubmit={submit} className="mt-9 space-y-5">
        <Field
          id="fullName"
          label="Full name"
          value={form.fullName}
          error={errors["fullName"]}
          placeholder="Nimal Perera"
          onChange={(v) => set("fullName", v)}
        />
        <div className="grid gap-5 sm:grid-cols-2">
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
            id="phone"
            label="Phone"
            value={form.phone}
            error={errors["phone"]}
            placeholder="+94 77 123 4567"
            onChange={(v) => set("phone", v)}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            error={errors["password"]}
            placeholder="••••••••"
            onChange={(v) => set("password", v)}
          />
          <Field
            id="confirmPassword"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            error={errors["confirmPassword"]}
            placeholder="••••••••"
            onChange={(v) => set("confirmPassword", v)}
          />
        </div>

        <LocationSelects
          districtId={form.districtId}
          cityId={form.cityId}
          districtError={errors["districtId"]}
          cityError={errors["cityId"]}
          onChange={({ districtId, cityId }) => {
            setForm((f) => ({ ...f, districtId, cityId }));
            setErrors((e) => ({ ...e, districtId: "", cityId: "" }));
          }}
        />

        <Field
          id="address"
          label="Address"
          value={form.address}
          error={errors["address"]}
          placeholder="24 Old Kesbewa Road"
          onChange={(v) => set("address", v)}
        />

        {errors["form"] && (
          <p className="rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {errors["form"]}
          </p>
        )}

        <Button type="submit" variant="brass" size="xl" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Create Account
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Already with us?{" "}
        <Link to="/auth" className="uppercase tracking-[0.16em] hover:text-brass">
          Sign in
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
