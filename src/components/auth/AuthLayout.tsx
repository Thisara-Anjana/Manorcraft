import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export function BrandMark({ inverted = true }: { inverted?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-sm border border-brass/70">
        <span className="font-display text-lg text-brass">M</span>
      </span>
      <span
        className={`font-display text-2xl uppercase tracking-[0.18em] ${
          inverted ? "text-primary-foreground" : "text-foreground"
        }`}
      >
        Manorcraft
      </span>
    </Link>
  );
}

/**
 * Split-screen shell shared by the customer, technician and admin entry points.
 * The aside changes tone per audience while the brand system stays constant.
 */
export function AuthLayout({
  eyebrow,
  asideTitle,
  asideBody,
  asideFooter,
  children,
}: {
  eyebrow: string;
  asideTitle: string;
  asideBody: string;
  asideFooter?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="surface-navy relative hidden flex-col justify-between p-14 lg:flex">
        <BrandMark />
        <div>
          <span className="text-[0.7rem] uppercase tracking-[0.32em] text-brass">{eyebrow}</span>
          <h2 className="mt-6 max-w-md font-display text-5xl font-light leading-tight text-primary-foreground">
            {asideTitle}
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-primary-foreground/70">
            {asideBody}
          </p>
        </div>
        <div className="text-xs uppercase tracking-[0.16em] text-primary-foreground/60">
          {asideFooter}
        </div>
      </aside>

      <main className="flex items-center justify-center bg-background px-6 py-14">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <BrandMark inverted={false} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
