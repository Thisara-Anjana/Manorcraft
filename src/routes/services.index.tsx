import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Star } from "lucide-react";

import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { listServices } from "@/lib/services.functions";

export const Route = createFileRoute("/services/")({
  loader: () => listServices(),
  head: () => ({
    meta: [
      { title: "Home Services & Pricing | Manorcraft Sri Lanka" },
      {
        name: "description",
        content:
          "Browse Manorcraft home services — plumbing, electrical, masonry and AC repair — with transparent starting prices, hourly rates and customer ratings.",
      },
      { property: "og:title", content: "Home Services & Pricing | Manorcraft Sri Lanka" },
      {
        property: "og:description",
        content: "Transparent pricing for verified plumbing, electrical, masonry and AC experts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <ServiceShell>
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t load our services right now. Please refresh and try again.
      </p>
    </ServiceShell>
  ),
  notFoundComponent: () => (
    <ServiceShell>
      <p className="text-sm text-muted-foreground">No services found.</p>
    </ServiceShell>
  ),
  component: ServicesPage,
});

function ServiceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav solid />
      <main className="mx-auto max-w-6xl px-6 py-16">{children}</main>
    </div>
  );
}

export function formatLkr(value: number) {
  return `LKR ${value.toLocaleString("en-LK")}`;
}

function ServicesPage() {
  const services = Route.useLoaderData();

  return (
    <ServiceShell>
      <span className="text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground">
        Service Catalogue
      </span>
      <h1 className="mt-3 font-display text-5xl font-light text-foreground">Our Services</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Transparent pricing, verified craftsmen and island-wide coverage. Every visit is quoted from
        a published starting price with a clear hourly rate.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {services.map((service) => (
          <article
            key={service.service_id}
            className="flex flex-col rounded-sm border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-brass/50 hover:shadow-[var(--shadow-luxe)]"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-3xl font-light text-foreground">{service.name}</h2>
              {service.rating !== null && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-brass text-brass" />
                  {service.rating.toFixed(1)} ({service.review_count})
                </span>
              )}
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              {service.tagline || service.description}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
              <div>
                <dt className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
                  Starting from
                </dt>
                <dd className="mt-1 font-display text-xl text-brass">
                  {formatLkr(service.starting_price)}
                </dd>
              </div>
              <div>
                <dt className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
                  Hourly rate
                </dt>
                <dd className="mt-1 font-display text-xl text-foreground">
                  {formatLkr(service.hourly_rate)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-brass" />
              Typical visit ≈ {Math.round(service.estimated_duration_minutes / 60)}h
            </p>
            <Button asChild variant="outlineBrass" className="mt-6 w-full">
              <Link to="/services/$slug" params={{ slug: service.slug }}>
                View details <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </article>
        ))}
      </div>
    </ServiceShell>
  );
}
