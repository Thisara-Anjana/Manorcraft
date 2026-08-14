import { createFileRoute, Outlet, Link } from "@tanstack/react-router";

import { AdminSidebar } from "@/components/AdminSidebar";
import { PortalGuard } from "@/components/PortalGuard";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
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
            <PortalGuard require="admin">
              <Outlet />
            </PortalGuard>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
