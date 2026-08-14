import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { checkIsAdmin } from "@/lib/dispatch.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const check = useServerFn(checkIsAdmin);
  const { data, isPending } = useQuery({ queryKey: ["is-admin"], queryFn: () => check({}) });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-3 border-b bg-background px-4">
            <SidebarTrigger />
            <span className="text-sm font-medium tracking-wide text-foreground">
              Operations Console
            </span>
            <Link
              to="/"
              className="ml-auto text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              Back to site
            </Link>
          </header>
          <main className="flex-1 p-6">
            {isPending ? (
              <p className="text-sm text-muted-foreground">Verifying access…</p>
            ) : data?.isAdmin ? (
              <Outlet />
            ) : (
              <div className="mx-auto max-w-md rounded-md border border-border/70 bg-background p-8 text-center">
                <h1 className="font-display text-2xl">Restricted area</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  This console is limited to Manorcraft branch managers. Ask an administrator to
                  grant your account admin access.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
