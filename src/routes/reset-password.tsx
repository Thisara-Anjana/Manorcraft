import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { resolvePortalHome } from "@/lib/auth-routing";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a New Password | Manorcraft" },
      {
        name: "description",
        content: "Choose a new password for your Manorcraft account.",
      },
      { property: "og:title", content: "Set a New Password | Manorcraft" },
      {
        property: "og:description",
        content: "Securely update the password on your Manorcraft account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match.",
  });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
    const { error } = await supabase.auth.updateUser({ password: form.password });
    setLoading(false);
    if (error) {
      toast.error("Could not update your password", { description: error.message });
      return;
    }
    toast.success("Password updated");
    navigate({ to: await resolvePortalHome(), replace: true });
  };

  return (
    <AuthLayout
      eyebrow="Account Security"
      asideTitle="Choose a new password."
      asideBody="For your protection, reset links expire shortly after they are issued."
      asideFooter="Encrypted · Private · Manorcraft"
    >
      <span className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.28em] text-muted-foreground">
        <KeyRound className="size-4 text-brass" /> Reset password
      </span>
      <h1 className="mt-3 font-display text-4xl font-light text-foreground">New password</h1>

      {!ready ? (
        <p className="mt-6 rounded-sm border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          Open this page from the reset link in your email to continue.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="new-password"
              className="text-xs uppercase tracking-[0.16em] text-muted-foreground"
            >
              New password
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className="h-11"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
            />
            {errors["password"] && <p className="text-xs text-destructive">{errors["password"]}</p>}
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="confirm-password"
              className="text-xs uppercase tracking-[0.16em] text-muted-foreground"
            >
              Confirm password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className="h-11"
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              placeholder="••••••••"
            />
            {errors["confirm"] && <p className="text-xs text-destructive">{errors["confirm"]}</p>}
          </div>
          <Button type="submit" variant="brass" size="xl" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />} Update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
