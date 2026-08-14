import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In or Create Account | Manorcraft" },
      {
        name: "description",
        content:
          "Access your Manorcraft account to book verified plumbing, electrical, masonry and AC repair experts across Sri Lanka.",
      },
      { property: "og:title", content: "Sign In or Create Account | Manorcraft" },
      {
        property: "og:description",
        content: "Sign in to schedule and track premium home maintenance with Manorcraft.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(80),
  phone: z.string().trim().min(7, "Please enter a valid phone number.").max(20),
});

const DEMO_ACCOUNTS = [
  { label: "Log in as Admin", email: "admin@manorcraft.com", to: "/admin" },
  { label: "Log in as Tech", email: "tech@manorcraft.com", to: "/technician" },
  { label: "Log in as Customer", email: "customer@manorcraft.com", to: "/dashboard" },
] as const;

type DemoAccount = (typeof DEMO_ACCOUNTS)[number];


function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/book", replace: true });
    });
  }, [navigate]);

  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const collect = (result: z.SafeParseReturnType<unknown, unknown>) => {
    if (result.success) return true;
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) next[String(issue.path[0])] = issue.message;
    setErrors(next);
    return false;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collect(signInSchema.safeParse(form))) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });
    setLoading(false);
    if (error) {
      toast.error("Could not sign in", { description: error.message });
      return;
    }
    toast.success("Welcome back to Manorcraft");
    navigate({ to: "/book", replace: true });
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
    if (data.session) {
      toast.success("Account created");
      navigate({ to: "/book", replace: true });
    } else {
      toast.success("Check your email", {
        description: "Confirm your address to activate your Manorcraft account.",
      });
    }
  };

  const demoLogin = async (acc: DemoAccount) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: "password123",
    });
    setLoading(false);
    if (error) {
      toast.error("Demo login failed", { description: error.message });
      return;
    }
    toast.success(`Signed in as ${acc.email}`);
    navigate({ to: acc.to, replace: true });
  };



  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="surface-navy relative hidden flex-col justify-between p-14 lg:flex">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-sm border border-brass/70">
            <span className="font-display text-lg text-brass">M</span>
          </span>
          <span className="font-display text-2xl uppercase tracking-[0.18em] text-primary-foreground">
            Manorcraft
          </span>
        </Link>

        <div>
          <span className="text-[0.7rem] uppercase tracking-[0.32em] text-brass">
            Members Entrance
          </span>
          <h2 className="mt-6 max-w-md font-display text-5xl font-light leading-tight text-primary-foreground">
            Craftsmanship, reserved for your household.
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
            Sign in to schedule vetted plumbing, electrical, masonry and AC specialists across
            Colombo, Kandy and Anuradhapura.
          </p>
        </div>

        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-primary-foreground/60">
          <ShieldCheck className="size-4 text-brass" /> Insured · Vetted · Discreet
        </p>
      </aside>

      <main className="flex items-center justify-center bg-background px-6 py-16">
        <div className="w-full max-w-md">
          <div className="text-center lg:text-left">
            <span className="text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground">
              Account
            </span>
            <h1 className="mt-3 font-display text-4xl font-light text-foreground">
              Login &amp; Sign Up
            </h1>
          </div>

          <Tabs defaultValue="signin" className="mt-10">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-5 pt-6">
                <EmailPassword form={form} errors={errors} set={set} />
                <Button type="submit" variant="brass" size="xl" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />} Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-5 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Full name
                  </Label>
                  <Input
                    id="fullName"
                    className="h-11"
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    placeholder="Thisara Anjana"
                  />
                  {errors['fullName'] && <p className="text-xs text-destructive">{errors['fullName']}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Phone number
                  </Label>
                  <Input
                    id="phone"
                    className="h-11"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+94 77 123 4567"
                  />
                  {errors['phone'] && <p className="text-xs text-destructive">{errors['phone']}</p>}
                </div>
                <EmailPassword form={form} errors={errors} set={set} />
                <Button type="submit" variant="brass" size="xl" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />} Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-10 rounded-sm border border-dashed border-brass/50 p-5">
            <p className="text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground">
              Demo Logins (temporary)
            </p>
            <div className="mt-4 grid gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <Button
                  key={acc.email}
                  type="button"
                  variant="outlineBrass"
                  className="w-full justify-between"
                  disabled={loading}
                  onClick={() => demoLogin(acc)}
                >
                  <span>{acc.label}</span>
                  <span className="text-xs opacity-70">{acc.to}</span>
                </Button>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link to="/" className="uppercase tracking-[0.16em] hover:text-brass">
              Return to Manorcraft
            </Link>
          </p>

        </div>
      </main>
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
      <div className="space-y-2">
        <Label htmlFor="email" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          className="h-11"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="you@example.com"
        />
        {errors['email'] && <p className="text-xs text-destructive">{errors['email']}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          className="h-11"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder="••••••••"
        />
        {errors['password'] && <p className="text-xs text-destructive">{errors['password']}</p>}
      </div>
    </>
  );
}
