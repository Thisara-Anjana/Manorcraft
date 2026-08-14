import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/admin/dispatch")({
  head: () => ({
    meta: [
      { title: "Dispatch Board | Manorcraft Admin" },
      { name: "description", content: "Assign and track Manorcraft field technicians in real time." },
      { property: "og:title", content: "Dispatch Board | Manorcraft Admin" },
      { property: "og:description", content: "Assign and track Manorcraft field technicians in real time." },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl tracking-tight">Dispatch Board</h1>
      <Card className="mt-6 border-border/70">
        <CardHeader>
          <CardTitle className="font-display text-xl">Coming next</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Drag-and-drop dispatch lanes for pending, assigned and in-progress jobs.
        </CardContent>
      </Card>
    </div>
  ),
});
