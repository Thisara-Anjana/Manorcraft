import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Home", to: "/" as const },
  { label: "Book a Service", to: "/book" as const },
  { label: "Admin Login", to: "/admin-login" as const },
  { label: "Technician Login", to: "/technician-login" as const },
];

export function SiteNav({ solid = false }: { solid?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className={solid ? "surface-navy relative z-30" : "absolute inset-x-0 top-0 z-30"}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-sm border border-brass/70">
            <span className="font-display text-lg text-brass">M</span>
          </span>
          <span className="font-display text-2xl tracking-[0.18em] text-primary-foreground uppercase">
            Manorcraft
          </span>
        </Link>

        <ul className="hidden items-center gap-9 md:flex">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link
                to={link.to}
                className="text-xs uppercase tracking-[0.16em] text-primary-foreground/75 transition-colors hover:text-brass"
                activeProps={{ className: "text-brass" }}
                activeOptions={{ exact: true }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
          className="text-primary-foreground md:hidden"
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <ul className="surface-navy mx-6 mb-4 space-y-4 rounded-sm border border-brass/25 p-6 md:hidden">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link
                to={link.to}
                onClick={() => setOpen(false)}
                className="block text-xs uppercase tracking-[0.16em] text-primary-foreground/80"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
