import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, CalendarClock, Coins, MapPin } from "lucide-react";

import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/for-professionals")({
  head: () => ({
    meta: [
      { title: "Work With Manorcraft | Jobs for Home Service Professionals" },
      {
        name: "description",
        content:
          "Join Manorcraft as a verified plumber, electrician, mason or AC technician. Steady island-wide jobs, transparent pay and a mobile portal built for the field.",
      },
      { property: "og:title", content: "Work With Manorcraft | Jobs for Professionals" },
      {
        property: "og:description",
        content: "Steady jobs, fair pay and a field-ready portal for Sri Lankan tradespeople.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForProfessionals,
});

const perks = [
  {
    icon: Coins,
    title: "Transparent pay",
    body: "Published starting prices and hourly rates on every job — no haggling on the doorstep.",
  },
  {
    icon: CalendarClock,
    title: "Jobs that fit your day",
    body: "Accept or decline each dispatch. Your schedule stays yours.",
  },
  {
    icon: MapPin,
    title: "Optimised routes",
    body: "We sequence your stops with street-level routing so you drive less and earn more.",
  },
  {
    icon: BadgeCheck,
    title: "Verified clientele",
    body: "Every customer books through a registered Manorcraft account.",
  },
];

function ForProfessionals() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav solid />
      <main>
        <section className="surface-navy px-6 py-24">
          <div className="mx-auto max-w-4xl">
            <span className="text-[0.7rem] uppercase tracking-[0.32em] text-brass">
              For Professionals
            </span>
            <h1 className="mt-6 font-display text-5xl font-light leading-tight text-primary-foreground sm:text-6xl">
              Craft your trade into a <span className="text-brass-gradient">business</span>.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/75">
              Manorcraft connects Sri Lanka&apos;s best plumbers, electricians, masons and AC
              technicians with households that value quality work.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild variant="brass" size="xl">
                <Link to="/technician-login">Technician Login</Link>
              </Button>
              <Button asChild variant="outlineBrass" size="xl">
                <a href="mailto:careers@manorcraft.lk?subject=Technician%20Application">
                  Apply to join
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-4xl font-light text-foreground">Why join Manorcraft</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {perks.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-sm border border-border bg-card p-8">
                <span className="flex h-11 w-11 items-center justify-center rounded-sm border border-brass/40 text-brass">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-6 font-display text-2xl font-light text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
