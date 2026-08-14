import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/technicians")({
  head: () => ({
    meta: [
      { title: "Technicians | Manorcraft Admin" },
      {
        name: "description",
        content: "Manage Manorcraft's verified technician roster, skills and availability.",
      },
      { property: "og:title", content: "Technicians | Manorcraft Admin" },
      {
        property: "og:description",
        content: "Manage Manorcraft's verified technician roster, skills and availability.",
      },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl tracking-tight">Technicians</h1>
      <Card className="mt-6 border-border/70">
        <CardHeader>
          <CardTitle className="font-display text-xl">Roster</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Technician profiles, certifications and district coverage will live here.
        </CardContent>
      </Card>
    </div>
  ),
});
