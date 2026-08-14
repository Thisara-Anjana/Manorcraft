import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { getPortalAccess } from "@/lib/portal.functions";

type Portal = "admin" | "technician";

/**
 * Client-side role gate. Signed-in users without the required role are sent to
 * the portal they do have access to (falling back to the customer dashboard).
 */
export function PortalGuard({ require: required, children }: { require: Portal; children: ReactNode }) {
  const navigate = useNavigate();
  const fetchAccess = useServerFn(getPortalAccess);
  const { data, isPending } = useQuery({
    queryKey: ["portal-access"],
    queryFn: () => fetchAccess({}),
  });

  const allowed = required === "admin" ? data?.isAdmin : data?.isTechnician;

  useEffect(() => {
    if (isPending || !data || allowed) return;
    const to = data.isAdmin ? "/admin" : data.isTechnician ? "/technician" : "/dashboard";
    navigate({ to, replace: true });
  }, [isPending, data, allowed, navigate]);

  if (isPending || !allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verifying access…
      </div>
    );
  }

  return <>{children}</>;
}
