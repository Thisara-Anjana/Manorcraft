import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HardHat, Home, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/get-started")({
  head: () => ({
    meta: [
      { title: "Choose Your Experience | Manorcraft" },
      {
        name: "description",
        content:
          "Continue as a Manorcraft customer to book verified home professionals, or as a technician to manage jobs and grow your business.",
      },
      { property: "og:title", content: "Choose Your Experience | Manorcraft" },
      {
        property: "og:description",
        content: "Two ways into Manorcraft — book trusted home services, or work as a professional.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChooseExperience,
});

const cards = [
  {
    icon: Home,
    title: "Customer",
    body: "Book trusted professionals for your home.",
    cta: "Continue as Customer",
    to: "/auth" as const,
  },
  {
    icon: HardHat,
    title: "Professional",
    body: "Find jobs and manage your services.",
    cta: "Continue as Technician",
    to: "/technician-login" as const,
  },
];

function ChooseExperience() {
  return (
    <main className="surface-navy flex min-h-screen flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-4xl">
        <div className="text-center">
          <Link
            to="/"
            className="font-display text-3xl uppercase tracking-[0.3em] text-primary-foreground transition-colors hover:text-brass"
          >
            Manorcraft
          </Link>
          <p className="mt-5 font-display text-3xl font-light text-primary-foreground/90">
            How can we help you today?
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {cards.map(({ icon: Icon, title, body, cta, to }) => (
            <article
              key={title}
              className="group flex flex-col rounded-sm border border-brass/25 bg-background/95 p-9 transition-all duration-300 hover:-translate-y-1 hover:border-brass/60 hover:shadow-[var(--shadow-luxe)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-sm border border-brass/50 text-brass transition-colors group-hover:bg-brass group-hover:text-accent-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-7 font-display text-3xl font-light text-foreground">{title}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              <Button asChild variant="brass" size="xl" className="mt-8 w-full">
                <Link to={to}>
                  {cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </article>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-3 border-t border-brass/15 pt-10">
          <span className="text-[0.7rem] uppercase tracking-[0.28em] text-primary-foreground/50">
            Manorcraft Administration
          </span>
          <Link
            to="/admin-login"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-primary-foreground/65 transition-colors hover:text-brass"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Sign in as Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
