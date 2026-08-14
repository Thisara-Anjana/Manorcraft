import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Settings,
  ShieldCheck,
  Map as MapIcon,
} from "lucide-react";

import { useBrandLogo } from "@/hooks/useBrandLogo";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Dispatch Board", url: "/admin/dispatch", icon: ClipboardList },
  { title: "Technicians", url: "/admin/technicians", icon: Users },
  { title: "Admins", url: "/admin/admins", icon: ShieldCheck },
  { title: "Settings", url: "/admin/settings", icon: Settings },
] as const;

export function AdminSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const logo = useBrandLogo();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5">
        {logo.data?.url ? (
          <img src={logo.data.url} alt="Manorcraft" className="h-8 max-w-[150px] object-contain" />
        ) : (
          <span className="font-display text-xl tracking-wide text-sidebar-foreground">
            Manorcraft
          </span>
        )}
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Admin</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={currentPath === item.url}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
