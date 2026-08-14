import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";

const SmartRoutingMap = lazy(() => import("@/components/SmartRoutingMap"));

export const Route = createFileRoute("/_authenticated/admin/map")({
  head: () => ({
    meta: [
      { title: "Smart Routing Map | Manorcraft Admin" },
      {
        name: "description",
        content:
          "Visualise open Manorcraft job tickets across Sri Lanka and plot optimised technician routes.",
      },
      { property: "og:title", content: "Smart Routing Map | Manorcraft Admin" },
      {
        property: "og:description",
        content:
          "Visualise open Manorcraft job tickets across Sri Lanka and plot optimised technician routes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapView,
});

function MapView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide text-foreground">Smart Routing Map</h1>
        <p className="text-sm text-muted-foreground">
          Assign jobs geographically and plot the most efficient path across the island.
        </p>
      </div>
      <ClientOnly fallback={<Skeleton className="h-[70vh] w-full rounded-xl" />}>
        <Suspense fallback={<Skeleton className="h-[70vh] w-full rounded-xl" />}>
          <SmartRoutingMap />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
