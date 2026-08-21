import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { resolvePortalHome } from "@/lib/auth-routing";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ForgotPasswordDialog } from "@/components/auth/ForgotPasswordDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(80),
  phone: z.string().trim().min(7, "Please enter a valid phone number.").max(20),
});

function CustomerAuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "" });

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

  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const collect = (result: z.SafeParseReturnType<unknown, unknown>) => {
    if (result.success) return true;
    const next: Record<string, string> = {};
    for (const issue of (result as z.SafeParseError<unknown>).error.issues) {
      next[String(issue.path[0])] = issue.message;
    }
    setErrors(next);
    return false;
  };

  const persistEmail = () => {
    if (remember) window.localStorage.setItem(REMEMBER_KEY, form.email.trim());
    else window.localStorage.removeItem(REMEMBER_KEY);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collect(signInSchema.safeParse(form))) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });
    if (error) {
      setLoading(false);
      toast.error("Could not sign in", { description: error.message });
      return;
    }
    persistEmail();
    const home = await resolvePortalHome();
    setLoading(false);
    toast.success("Welcome back to Manorcraft");
    navigate({ to: home, replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collect(signUpSchema.safeParse(form))) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: form.fullName.trim(), phone_number: form.phone.trim() },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Could not create account", { description: error.message });
      return;
    }
    persistEmail();
    if (data.session) {
      toast.success("Account created");
      navigate({ to: "/dashboard", replace: true });
    } else {
      toast.success("Check your email", {
        description: "Confirm your address to activate your Manorcraft account.",
      });
    }
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

      <Tabs defaultValue="signin" className="mt-9">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Create Account</TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <form onSubmit={handleSignIn} className="space-y-5 pt-6">
            <EmailPassword form={form} errors={errors} set={set} />
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
            <Button type="submit" variant="brass" size="xl" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />} Sign In
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup">
          <form onSubmit={handleSignUp} className="space-y-5 pt-6">
            <Field
              id="fullName"
              label="Full name"
              value={form.fullName}
              error={errors["fullName"]}
              placeholder="Thisara Anjana"
              onChange={(v) => set("fullName", v)}
            />
            <Field
              id="phone"
              label="Phone number"
              value={form.phone}
              error={errors["phone"]}
              placeholder="+94 77 123 4567"
              onChange={(v) => set("phone", v)}
            />
            <EmailPassword form={form} errors={errors} set={set} />
            <Button type="submit" variant="brass" size="xl" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />} Create Customer Account
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="mt-10 rounded-sm border border-border bg-secondary/40 p-5 text-center">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Are you a technician?
        </p>
        <Button asChild variant="outlineBrass" className="mt-3 w-full">
          <Link to="/technician-login">Technician Login</Link>
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

function EmailPassword({
  form,
  errors,
  set,
}: {
  form: { email: string; password: string };
  errors: Record<string, string>;
  set: (key: "email" | "password", value: string) => void;
}) {
  return (
    <>
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
    </>
  );
}
