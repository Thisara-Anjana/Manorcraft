import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getPortalAccess } from "@/lib/portal.functions";

type Portal = "admin" | "technician";

/**
 * Client-side role gate. Signed-in users without the required role are sent to
 * the portal they do have access to (falling back to the customer dashboard).
 */
export function PortalGuard({ require: required, children }: { require: Portal; children: ReactNode }) {
  const navigate = useNavigate();
  const fetchAccess = useServerFn(getPortalAccess);
  const { data, isPending, isError } = useQuery({
    queryKey: ["portal-access"],
    queryFn: () => fetchAccess({}),
    retry: false,
  });

  const allowed = required === "admin" ? data?.isAdmin : data?.isTechnician;

  useEffect(() => {
    if (isPending || allowed) return;
    if (isError) {
      toast.error("You don't have access to this portal");
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    if (!data) return;
    const to = data.isAdmin ? "/admin" : data.isTechnician ? "/technician" : "/dashboard";
    if (!data.isAdmin && !data.isTechnician) {
      toast.error(`The ${required} portal is restricted`, {
        description: "Taking you back to your dashboard.",
      });
    }
    navigate({ to, replace: true });
  }, [isPending, isError, data, allowed, navigate, required]);

  if (isPending || !allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-brass" />
        Verifying access…
      </div>
    );
  }

  return <>{children}</>;
}
