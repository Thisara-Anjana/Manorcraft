import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CheckCircle2, Clock, Star, UserRound } from "lucide-react";

import { SiteNav } from "@/components/SiteNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServiceDetail } from "@/lib/services.functions";

export const Route = createFileRoute("/services/$slug")({
  loader: async ({ params }) => {
    const service = await getServiceDetail({ data: { slug: params.slug } });
    if (!service) throw notFound();
    return service;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Service unavailable | Manorcraft" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.name} in Sri Lanka | Manorcraft`;
    const description =
      `Book verified ${loaderData.name.toLowerCase()} professionals with Manorcraft.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t load this service. Please try again.
      </p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <h1 className="font-display text-4xl font-light text-foreground">Service not found</h1>
      <Button asChild variant="outlineBrass" className="mt-6">
        <Link to="/services">Back to services</Link>
      </Button>
    </Shell>
  ),
  component: ServiceDetailPage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav solid />
      <main className="mx-auto max-w-5xl px-6 py-16">{children}</main>
    </div>
  );
}

const lkr = (v: number) => `LKR ${v.toLocaleString("en-LK")}`;

function ServiceDetailPage() {
  const service = Route.useLoaderData();

  return (
    <Shell>
      <Link
        to="/services"
        className="text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-brass"
      >
        ← All services
      </Link>

      <header className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground">
            {service.category}
          </span>
          <h1 className="mt-3 font-display text-5xl font-light text-foreground">{service.name}</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {service.description}
          </p>
        </div>
        <Button asChild variant="brass" size="xl">
          <Link to="/book">Book this service</Link>
        </Button>
      </header>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <Stat label="Starting from" value={lkr(service.starting_price)} accent />
        <Stat label="Hourly rate" value={lkr(service.hourly_rate)} />
        <Stat
          label="Typical visit"
          value={`${Math.round(service.estimated_duration_minutes / 60)} hours`}
          icon={<Clock className="h-4 w-4 text-brass" />}
        />
      </section>

      <section className="mt-14">
        <h2 className="font-display text-3xl font-light text-foreground">Available professionals</h2>
        {service.available_professionals.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Our {service.name.toLowerCase()} roster is matched to you at booking — sign in to see
            who is available in your district.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {service.available_professionals.map((tech) => (
              <li
                key={tech.profile_id}
                className="flex items-center gap-3 rounded-sm border border-border bg-card p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-brass/40 text-brass">
                  <UserRound className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm text-foreground">{tech.full_name}</p>
                  <Badge variant="secondary" className="mt-1 text-[0.65rem]">
                    {tech.specialization} · {tech.rating.toFixed(1)}★ · {tech.completed_jobs} jobs
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-3xl font-light text-foreground">Customer reviews</h2>
          {service.rating !== null && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-brass text-brass" />
              {service.rating.toFixed(1)} · {service.review_count} reviews
            </span>
          )}
        </div>
        {service.reviews.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No reviews yet for this service — be the first to share your experience.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {service.reviews.map((review) => (
              <li key={review.review_id} className="rounded-sm border border-border bg-card p-6">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < review.rating ? "fill-brass text-brass" : "text-muted-foreground/40"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString("en-LK")}
                  </span>
                </div>
                {review.comment && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {review.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Shell>
  );
}

function Stat({
  label,
  value,
  accent = false,
  icon,
}: {
  label: string;
  value: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-sm border border-border bg-card p-6">
      <p className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p
        className={`mt-2 flex items-center gap-2 font-display text-2xl ${
          accent ? "text-brass" : "text-foreground"
        }`}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}
