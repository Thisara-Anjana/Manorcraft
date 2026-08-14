import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Manorcraft Admin" },
      { name: "description", content: "Configure Manorcraft service categories, districts and dispatch rules." },
      { property: "og:title", content: "Settings | Manorcraft Admin" },
      { property: "og:description", content: "Configure Manorcraft service categories, districts and dispatch rules." },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl tracking-tight">Settings</h1>
      <Card className="mt-6 border-border/70">
        <CardHeader>
          <CardTitle className="font-display text-xl">Workspace</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Service categories, coverage districts and dispatch preferences.
        </CardContent>
      </Card>
    </div>
  ),
});
