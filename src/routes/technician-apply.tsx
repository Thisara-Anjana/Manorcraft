import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, HardHat, Loader2 } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LocationSelects } from "@/components/LocationSelects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/technician-apply")({
  head: () => ({
    meta: [
      { title: "Apply as a Technician | Manorcraft Professionals" },
      {
        name: "description",
        content:
          "Apply to join the Manorcraft network of verified plumbing, electrical, masonry and AC professionals across Sri Lanka.",
      },
      { property: "og:title", content: "Apply as a Technician | Manorcraft Professionals" },
      {
        property: "og:description",
        content: "Steady work, fair pay and verified customers island-wide.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TechnicianApply,
});

const SPECIALIZATIONS = ["Plumbing", "Electrical", "Masonry", "AC Repair", "Carpentry", "Painting"];

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
    specialization: z.string().min(2, "Choose your main trade."),
    experienceYears: z
      .string()
      .regex(/^\d{1,2}$/, "Enter years of experience (0-99)."),
    bio: z.string().trim().min(20, "Tell us a little more (20+ characters).").max(600),
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
  specialization: "",
  experienceYears: "",
  bio: "",
};

function TechnicianApply() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: form.fullName.trim(),
          phone: form.phone.trim(),
          district_id: form.districtId,
          city_id: form.cityId,
          address: form.address.trim(),
          role: "TECHNICIAN",
          specialization: form.specialization,
          experience_years: form.experienceYears,
          bio: form.bio.trim(),
        },
      },
    });
    setLoading(false);
    if (error) {
      setErrors({
        form: friendlyAuthError(error, "Your application could not be submitted. Please try again."),
      });
      return;
    }
    await supabase.auth.signOut();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <AuthLayout
        eyebrow="Application Received"
        asideTitle="Thank you for applying."
        asideBody="Our operations team reviews every professional before they take their first job."
        asideFooter="Fair pay · Verified clients · Island-wide work"
      >
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-brass/50 text-brass">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <h1 className="mt-8 font-display text-4xl font-light text-foreground">
            Application submitted
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your profile will be reviewed by Manorcraft. We'll email you as soon as you're verified.
          </p>
          <Button asChild variant="brass" size="xl" className="mt-9 w-full">
            <Link to="/technician-login">Back to Technician Login</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Professional Application"
      asideTitle="Work with households that value your craft."
      asideBody="Join a vetted network of plumbers, electricians, masons and AC specialists across Sri Lanka."
      asideFooter="Fair pay · Verified clients · Island-wide work"
    >
      <span className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.28em] text-muted-foreground">
        <HardHat className="size-4 text-brass" /> Apply as a Technician
      </span>
      <h1 className="mt-3 font-display text-4xl font-light text-foreground">Join the network</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Applications are reviewed by our operations team before activation.
      </p>

      <form onSubmit={submit} className="mt-9 space-y-5">
        <Field
          id="fullName"
          label="Full name"
          value={form.fullName}
          error={errors["fullName"]}
          placeholder="John Perera"
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
            placeholder="you@manorcraft.lk"
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
          placeholder="8 Kotte Road, Rajagiriya"
          onChange={(v) => set("address", v)}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Specialization
            </Label>
            <Select
              value={form.specialization}
              onValueChange={(v) => set("specialization", v)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select your trade" />
              </SelectTrigger>
              <SelectContent>
                {SPECIALIZATIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors["specialization"] && (
              <p className="text-xs text-destructive">{errors["specialization"]}</p>
            )}
          </div>
          <Field
            id="experienceYears"
            label="Years of experience"
            value={form.experienceYears}
            error={errors["experienceYears"]}
            placeholder="7"
            onChange={(v) => set("experienceYears", v.replace(/[^\d]/g, "").slice(0, 2))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Short bio
          </Label>
          <Textarea
            id="bio"
            rows={4}
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="Certified electrician with 7 years of experience in domestic rewiring across Colombo."
          />
          {errors["bio"] && <p className="text-xs text-destructive">{errors["bio"]}</p>}
        </div>

        {errors["form"] && (
          <p className="rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {errors["form"]}
          </p>
        )}

        <Button type="submit" variant="brass" size="xl" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Submit Application
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Already approved?{" "}
        <Link to="/technician-login" className="uppercase tracking-[0.16em] hover:text-brass">
          Technician Login
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
