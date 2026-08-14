import { useEffect, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

const routedLinks = [
  { label: "Home", to: "/" as const },
  { label: "Book a Service", to: "/book" as const },
  { label: "My Bookings", to: "/dashboard" as const },
  { label: "Admin", to: "/admin" as const },
  { label: "Technician", to: "/technician" as const },
];


const linkClass =
  "text-xs uppercase tracking-[0.16em] text-primary-foreground/75 transition-colors hover:text-brass";

export function SiteNav({ solid = false }: { solid?: boolean }) {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  };

  const authLink = signedIn ? (
    <button type="button" onClick={signOut} className={linkClass}>
      Sign Out
    </button>
  ) : (
    <Link to="/auth" className={linkClass} activeProps={{ className: "text-brass" }}>
      Login / Sign Up
    </Link>
  );

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
          {routedLinks.map((link) => (
            <li key={link.label}>
              <Link
                to={link.to}
                className={linkClass}
                activeProps={{ className: "text-brass" }}
                activeOptions={{ exact: true }}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>{authLink}</li>
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
          {routedLinks.map((link) => (
            <li key={link.label}>
              <Link to={link.to} onClick={() => setOpen(false)} className={linkClass}>
                {link.label}
              </Link>
            </li>
          ))}
          <li>{authLink}</li>
        </ul>
      )}
    </header>
  );
}
