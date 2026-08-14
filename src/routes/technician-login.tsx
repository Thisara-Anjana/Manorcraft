import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, HardHat } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/technician-login")({
  head: () => ({
    meta: [
      { title: "Technician Login | Manorcraft Field Portal" },
      {
        name: "description",
        content:
          "Manorcraft field technicians sign in here to view assigned jobs and update job progress on the move.",
      },
      { property: "og:title", content: "Technician Login | Manorcraft Field Portal" },
      {
        property: "og:description",
        content: "Sign in to the Manorcraft technician portal to manage your assigned jobs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TechnicianLogin,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

function TechnicianLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/technician", replace: true });
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
    setLoading(false);
    if (error) {
      toast.error("Could not sign in", { description: error.message });
      return;
    }
    navigate({ to: "/technician", replace: true });
  };

  return (
    <main className="surface-navy flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link to="/" className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-sm border border-brass/70">
          <span className="font-display text-lg text-brass">M</span>
        </span>
        <span className="font-display text-2xl uppercase tracking-[0.18em] text-primary-foreground">
          Manorcraft
        </span>
      </Link>

      <div className="mt-10 w-full max-w-sm rounded-sm border border-brass/25 bg-background p-8">
        <span className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.28em] text-muted-foreground">
          <HardHat className="size-4 text-brass" /> Field Portal
        </span>
        <h1 className="mt-3 font-display text-3xl font-light text-foreground">Technician Login</h1>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="tech-email" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
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
            {errors['email'] && <p className="text-xs text-destructive">{errors['email']}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tech-password" className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
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
            {errors['password'] && <p className="text-xs text-destructive">{errors['password']}</p>}
          </div>
          <Button type="submit" variant="brass" size="xl" className="h-14 w-full text-base" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />} Enter Field Portal
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Customer instead?{" "}
          <Link to="/auth" className="uppercase tracking-[0.14em] hover:text-brass">
            Client login
          </Link>
        </p>
      </div>
    </main>
  );
}
