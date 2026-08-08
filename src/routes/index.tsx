import { createFileRoute } from "@tanstack/react-router";
import { Droplets, Zap, Hammer, Wind, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-manor.jpg";
import { SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Manorcraft | Elite Home Maintenance in Sri Lanka" },
      {
        name: "description",
        content:
          "Manorcraft delivers premium home repair and maintenance in Sri Lanka — verified plumbing, electrical, masonry and AC repair experts.",
      },
      { property: "og:title", content: "Manorcraft | Elite Home Maintenance & Craftsmanship" },
      {
        property: "og:description",
        content: "Verified craftsmen for plumbing, electrical, masonry and AC repair across Sri Lanka.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});


const services = [
  {
    icon: Droplets,
    title: "Plumbing",
    description: "Leak diagnostics, pipe restoration and fixture installation handled with precision.",
  },
  {
    icon: Zap,
    title: "Electrical",
    description: "Certified wiring, panel upgrades and lighting design for safe, refined interiors.",
  },
  {
    icon: Hammer,
    title: "Masonry",
    description: "Stonework, plastering and structural repair finished to heritage standards.",
  },
  {
    icon: Wind,
    title: "AC Repair",
    description: "Servicing, gas refills and installations that keep every room perfectly cool.",
  },
];

function Hero() {
  return (
    <section className="relative min-h-[92vh] overflow-hidden">
      <img
        src={heroImage}
        alt="Manorcraft craftsman at work in a luxury Sri Lankan villa"
        width={1600}
        height={1104}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="surface-navy absolute inset-0 opacity-85" />
      <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-center px-6 pt-32 pb-20">
        <span className="mb-6 flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.32em] text-brass">
          <span className="h-px w-10 bg-brass" />
          Est. Colombo · Island-wide
        </span>
        <h1 className="max-w-4xl text-5xl leading-[1.05] font-light text-primary-foreground sm:text-6xl lg:text-7xl">
          Elite Home Maintenance <span className="text-brass-gradient">&amp; Craftsmanship</span>
        </h1>
        <p className="mt-7 max-w-xl text-base leading-relaxed text-primary-foreground/75">
          Verified, background-checked experts across Sri Lanka — bringing meticulous workmanship
          and white-glove service to every residence we touch.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button asChild variant="brass" size="xl">
            <a href="/book">Book Now</a>
          </Button>
          <Button asChild variant="outlineBrass" size="xl">
            <a href="#services">Our Services</a>
          </Button>
        </div>
        <div className="mt-14 flex flex-wrap gap-10 text-primary-foreground/70">
          <span className="flex items-center gap-2 text-xs uppercase tracking-[0.16em]">
            <ShieldCheck className="text-brass" /> Vetted technicians
          </span>
          <span className="flex items-center gap-2 text-xs uppercase tracking-[0.16em]">
            <Star className="text-brass" /> 4.9 average rating
          </span>
        </div>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section id="services" className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <span className="text-[0.7rem] uppercase tracking-[0.32em] text-muted-foreground">
            Our Services
          </span>
          <h2 className="mt-4 text-4xl font-light text-foreground sm:text-5xl">
            Craftsmanship for every corner of the home
          </h2>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {services.map(({ icon: Icon, title, description }) => (
            <article key={title} className="group bg-card p-9 transition-colors hover:bg-secondary">
              <span className="flex h-12 w-12 items-center justify-center rounded-sm border border-brass/50 text-brass transition-colors group-hover:bg-brass group-hover:text-accent-foreground">
                <Icon />
              </span>
              <h3 className="mt-7 text-2xl font-medium text-foreground">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Landing() {
  return (
    <main>
      <SiteNav />
      <Hero />
      <Services />
      <footer className="surface-navy py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-xs uppercase tracking-[0.16em] text-primary-foreground/60 sm:flex-row">
          <span className="font-display text-base tracking-[0.18em] text-brass">Manorcraft</span>
          <span>© {new Date().getFullYear()} Manorcraft · Sri Lanka</span>
        </div>
      </footer>
    </main>
  );
}
