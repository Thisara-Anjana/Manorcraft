import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, ShieldMinus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCurrentUserId,
  grantAdminRole,
  listUsersWithRoles,
  revokeAdminRole,
  type ManagedUser,
} from "@/lib/roles.functions";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  head: () => ({
    meta: [
      { title: "Admin Access | Manorcraft Admin" },
      {
        name: "description",
        content: "Review Manorcraft accounts and grant or revoke administrator privileges.",
      },
      { property: "og:title", content: "Admin Access | Manorcraft Admin" },
      {
        property: "og:description",
        content: "Review Manorcraft accounts and grant or revoke administrator privileges.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminAccessPage,
});

const roleStyles: Record<string, string> = {
  admin: "border-brass/50 bg-brass/15 text-accent-foreground",
  technician: "border-transparent bg-primary text-primary-foreground",
  customer: "border-transparent bg-muted text-muted-foreground",
};

function AdminAccessPage() {
  const fetchUsers = useServerFn(listUsersWithRoles);
  const fetchMe = useServerFn(getCurrentUserId);
  const grant = useServerFn(grantAdminRole);
  const revoke = useServerFn(revokeAdminRole);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<{ user: ManagedUser; action: "grant" | "revoke" } | null>(
    null,
  );

  const users = useQuery({ queryKey: ["managed-users"], queryFn: () => fetchUsers({}) });
  const me = useQuery({ queryKey: ["current-user-id"], queryFn: () => fetchMe({}) });

  const mutation = useMutation({
    mutationFn: (vars: { userId: string; action: "grant" | "revoke" }) =>
      vars.action === "grant"
        ? grant({ data: { userId: vars.userId } })
        : revoke({ data: { userId: vars.userId } }),
    onSuccess: (_d, vars) => {
      toast.success(vars.action === "grant" ? "Admin access granted" : "Admin access revoked");
      setPending(null);
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = users.data ?? [];
    if (!term) return list;
    return list.filter(
      (u) =>
        u.email.toLowerCase().includes(term) || (u.fullName ?? "").toLowerCase().includes(term),
    );
  }, [users.data, search]);

  const adminCount = (users.data ?? []).filter((u) => u.roles.includes("admin")).length;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl tracking-tight">Admin Access</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {adminCount} administrator{adminCount === 1 ? "" : "s"} across {(users.data ?? []).length}{" "}
        account{(users.data ?? []).length === 1 ? "" : "s"}.
      </p>

      <Card className="mt-6 border-border/70">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="font-display text-xl">Accounts</CardTitle>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="sm:max-w-xs"
          />
        </CardHeader>
        <CardContent>
          {users.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading accounts…</p>
          ) : users.isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              {(users.error as Error).message}
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No accounts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const isAdmin = u.roles.includes("admin");
                    const isSelf = me.data?.userId === u.userId;
                    return (
                      <TableRow key={u.userId}>
                        <TableCell className="font-medium">
                          {u.fullName ?? "—"}
                          {isSelf && (
                            <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="text-muted-foreground">{u.phone ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              u.roles.map((r) => (
                                <Badge key={r} className={roleStyles[r] ?? ""}>
                                  {r.charAt(0).toUpperCase() + r.slice(1)}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isSelf}
                              onClick={() => setPending({ user: u, action: "revoke" })}
                            >
                              <ShieldMinus className="mr-1.5 h-4 w-4" />
                              Revoke Admin
                            </Button>
                          ) : (
                            <Button
                              variant="outlineBrass"
                              size="sm"
                              onClick={() => setPending({ user: u, action: "grant" })}
                            >
                              <ShieldCheck className="mr-1.5 h-4 w-4" />
                              Make Admin
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {pending?.action === "grant" ? "Grant admin access" : "Revoke admin access"}
            </DialogTitle>
            <DialogDescription>
              {pending?.action === "grant"
                ? `${pending?.user.fullName ?? pending?.user.email} will be able to view every ticket, dispatch technicians and manage admin access.`
                : `${pending?.user.fullName ?? pending?.user.email} will lose access to the admin dashboard.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant={pending?.action === "grant" ? "brass" : "destructive"}
              disabled={mutation.isPending}
              onClick={() =>
                pending && mutation.mutate({ userId: pending.user.userId, action: pending.action })
              }
            >
              {mutation.isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
