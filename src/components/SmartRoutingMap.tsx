import { useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MapPin, Route as RouteIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignTechnician, listMapTickets, listTechnicians } from "@/lib/dispatch.functions";

type MapTicket = Awaited<ReturnType<typeof listMapTickets>>[number];

const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];

const DISTRICT_COORDS: Record<string, [number, number]> = {
  colombo: [6.9271, 79.8612],
  kandy: [7.2906, 80.6337],
  anuradhapura: [8.3114, 80.4037],
  galle: [6.0535, 80.221],
  jaffna: [9.6615, 80.0255],
  negombo: [7.2083, 79.8358],
  matara: [5.9549, 80.555],
  kurunegala: [7.4863, 80.3623],
  batticaloa: [7.7102, 81.6924],
  trincomalee: [8.5874, 81.2152],
};

/** Deterministic small offset so multiple jobs in a district don't stack. */
function jitter(seed: string, index: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 1000;
  return ((hash % 100) / 100 - 0.5) * 0.12 + index * 0.004;
}

function coordsFor(ticket: MapTicket, index: number): [number, number] {
  if (ticket.latitude != null && ticket.longitude != null) {
    return [ticket.latitude, ticket.longitude];
  }
  const base = DISTRICT_COORDS[ticket.district?.toLowerCase() ?? ""] ?? SRI_LANKA_CENTER;
  return [base[0] + jitter(ticket.ticket_id, index), base[1] + jitter(ticket.district, index)];
}

function distance(a: [number, number], b: [number, number]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Total path length of an open route starting at the depot. */
function routeLength<T extends { position: [number, number] }>(
  stops: T[],
  depot: [number, number],
) {
  let total = 0;
  let cursor = depot;
  for (const stop of stops) {
    total += distance(cursor, stop.position);
    cursor = stop.position;
  }
  return total;
}

/**
 * 2-opt refinement: repeatedly reverse a segment when doing so shortens the
 * path, which removes the zig-zags a greedy nearest-neighbour pass leaves behind.
 */
function twoOpt<T extends { position: [number, number] }>(
  stops: T[],
  depot: [number, number],
): T[] {
  if (stops.length < 4) return stops;
  let best = [...stops];
  let bestLength = routeLength(best, depot);
  let improved = true;
  let guard = 0;

  while (improved && guard < 50) {
    improved = false;
    guard += 1;
    for (let i = 0; i < best.length - 1; i += 1) {
      for (let k = i + 1; k < best.length; k += 1) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, k + 1).reverse(),
          ...best.slice(k + 1),
        ];
        const length = routeLength(candidate, depot);
        if (length < bestLength - 1e-9) {
          best = candidate;
          bestLength = length;
          improved = true;
        }
      }
    }
  }
  return best;
}

/** Nearest-neighbour ordering plus 2-opt, used as a fallback when OSRM is unavailable. */
function optimiseRoute<T extends { position: [number, number] }>(stops: T[]): T[] {
  if (stops.length < 2) return stops;
  const depot: [number, number] = DISTRICT_COORDS["colombo"] ?? SRI_LANKA_CENTER;
  const remaining = [...stops];
  let cursor: [number, number] = depot;
  const ordered: T[] = [];

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    remaining.forEach((stop, i) => {
      const d = distance(stop.position, cursor);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    });
    const [next] = remaining.splice(bestIndex, 1);
    if (!next) break;
    ordered.push(next);
    cursor = next.position;
  }
  return twoOpt(ordered, depot);
}

type OsrmTrip = {
  order: number[];
  geometry: [number, number][];
  distanceKm: number;
  durationMin: number;
};

/** Ask OSRM for a street-level optimised trip. Index 0 of `positions` is the depot. */
async function fetchOsrmTrip(positions: [number, number][]): Promise<OsrmTrip> {
  const coords = positions.map(([lat, lon]) => `${lon},${lat}`).join(";");
  const url = `https://router.project-osrm.org/trip/v1/driving/${coords}?roundtrip=false&source=first&overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM request failed (${res.status})`);
  const json = (await res.json()) as {
    code: string;
    trips?: {
      distance: number;
      duration: number;
      geometry: { coordinates: [number, number][] };
    }[];
    waypoints?: { waypoint_index: number }[];
  };
  const trip = json.trips?.[0];
  if (json.code !== "Ok" || !trip) throw new Error("OSRM could not compute a route");

  // waypoints[i].waypoint_index = position of input i in the optimised order.
  const waypoints = json.waypoints ?? [];
  const order = waypoints
    .map((w, inputIndex) => ({ inputIndex, at: w.waypoint_index }))
    .filter((w) => w.inputIndex > 0) // drop the depot
    .sort((a, b) => a.at - b.at)
    .map((w) => w.inputIndex - 1); // back to stop indices

  return {
    order,
    geometry: trip.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]),
    distanceKm: trip.distance / 1000,
    durationMin: trip.duration / 60,
  };
}

function formatDuration(minutes: number) {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} hr ${m} min` : `${m} min`;
}

function markerIcon(status: string, label?: number) {
  const gold = "#c9a227";
  const navy = "#0f1e3d";
  const fill = status === "Assigned" ? gold : navy;
  const text = status === "Assigned" ? navy : gold;
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:${fill};border:2px solid ${text};color:${text};font:600 12px/1 Karla,system-ui,sans-serif;box-shadow:0 6px 16px rgba(15,30,61,.35)">${
      label ?? ""
    }</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function SmartRoutingMap() {
  const fetchTickets = useServerFn(listMapTickets);
  const fetchTechs = useServerFn(listTechnicians);
  const assign = useServerFn(assignTechnician);
  const queryClient = useQueryClient();
  const [selectedTech, setSelectedTech] = useState<string>("all");

  const ticketsQuery = useQuery({
    queryKey: ["admin", "map-tickets"],
    queryFn: () => fetchTickets(),
  });
  const techsQuery = useQuery({ queryKey: ["admin", "technicians"], queryFn: () => fetchTechs() });

  const assignMutation = useMutation({
    mutationFn: (vars: { ticketId: string; technicianId: string }) => assign({ data: vars }),
    onSuccess: () => {
      toast.success("Technician assigned", { description: "The route has been updated." });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) =>
      toast.error("Could not assign technician", { description: error.message }),
  });

  const techName = (id: string | null) =>
    (techsQuery.data ?? []).find((t) => t.technician_id === id)?.full_name ?? null;

  const points = useMemo(
    () =>
      (ticketsQuery.data ?? []).map((ticket, index) => ({
        ticket,
        position: coordsFor(ticket, index),
      })),
    [ticketsQuery.data],
  );

  const visible = useMemo(
    () =>
      selectedTech === "all"
        ? points
        : points.filter((p) => p.ticket.technician_id === selectedTech),
    [points, selectedTech],
  );

  const depot: [number, number] = DISTRICT_COORDS["colombo"] ?? SRI_LANKA_CENTER;

  const osrmKey = visible.map((p) => `${p.position[0].toFixed(5)},${p.position[1].toFixed(5)}`);

  const tripQuery = useQuery({
    queryKey: ["admin", "osrm-trip", selectedTech, osrmKey],
    queryFn: () => fetchOsrmTrip([depot, ...visible.map((p) => p.position)]),
    enabled: selectedTech !== "all" && visible.length > 0,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const route = useMemo(() => {
    if (selectedTech === "all") return [];
    const order = tripQuery.data?.order;
    if (order && order.length === visible.length) {
      return order.map((i) => visible[i]!).filter(Boolean);
    }
    return optimiseRoute(visible);
  }, [selectedTech, visible, tripQuery.data]);

  const routeLine =
    tripQuery.data && selectedTech !== "all"
      ? tripQuery.data.geometry
      : route.map((stop) => stop.position);
  const numbering = new Map(route.map((stop, i) => [stop.ticket.ticket_id, i + 1]));

  if (ticketsQuery.isLoading) {
    return <Skeleton className="h-[70vh] w-full rounded-xl" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card className="overflow-hidden border-brass/30">
        <CardContent className="p-0">
          <div className="h-[70vh] w-full [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:bg-primary/5">
            <MapContainer center={SRI_LANKA_CENTER} zoom={8} scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              {routeLine.length > 1 && (
                <Polyline
                  positions={routeLine}
                  pathOptions={{
                    color: "#c9a227",
                    weight: tripQuery.data ? 5 : 4,
                    opacity: 0.9,
                    ...(tripQuery.data ? {} : { dashArray: "8 10" }),
                  }}
                />
              )}

              {visible.map(({ ticket, position }) => (
                <Marker
                  key={ticket.ticket_id}
                  position={position}
                  icon={markerIcon(ticket.job_status, numbering.get(ticket.ticket_id))}
                >
                  <Popup>
                    <div className="min-w-[220px] space-y-2 font-sans">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-base text-primary">
                          {ticket.job_category}
                        </span>
                        <Badge variant="outline" className="border-brass/50 text-[10px]">
                          {ticket.job_status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ticket.customer_name} &middot; {ticket.district}
                      </p>
                      {ticket.address && (
                        <p className="text-xs text-muted-foreground">{ticket.address}</p>
                      )}
                      <p className="text-xs">{ticket.description}</p>
                      <div className="pt-1">
                        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          Assign to tech
                        </p>
                        <Select
                          {...(ticket.technician_id ? { value: ticket.technician_id } : {})}
                          onValueChange={(technicianId) =>
                            assignMutation.mutate({ ticketId: ticket.ticket_id, technicianId })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select technician" />
                          </SelectTrigger>
                          <SelectContent>
                            {(techsQuery.data ?? []).map((tech) => (
                              <SelectItem key={tech.technician_id} value={tech.technician_id}>
                                {tech.full_name} — {tech.primary_skill}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-brass/30">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2 font-display text-xl">
            <RouteIcon className="h-4 w-4 text-brass" /> Technician Routes
          </CardTitle>
          <Select value={selectedTech} onValueChange={setSelectedTech}>
            <SelectTrigger>
              <SelectValue placeholder="All technicians" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All open jobs</SelectItem>
              {(techsQuery.data ?? []).map((tech) => (
                <SelectItem key={tech.technician_id} value={tech.technician_id}>
                  {tech.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedTech === "all" ? (
            <p className="text-sm text-muted-foreground">
              Showing {points.length} open job{points.length === 1 ? "" : "s"} across Sri Lanka.
              Select a technician to plot their optimised route.
            </p>
          ) : route.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open jobs assigned to this technician yet.
            </p>
          ) : (
            <>
              {tripQuery.isFetching ? (
                <Skeleton className="h-16 w-full rounded-lg" />
              ) : tripQuery.data ? (
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-brass/40 bg-primary/5 p-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Driving distance
                    </p>
                    <p className="font-display text-xl text-primary">
                      {tripQuery.data.distanceKm.toFixed(1)} km
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Estimated time
                    </p>
                    <p className="font-display text-xl text-primary">
                      {formatDuration(tripQuery.data.durationMin)}
                    </p>
                  </div>
                </div>
              ) : tripQuery.isError ? (
                <p className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
                  Live road routing is unavailable right now — showing an estimated sequence
                  instead.
                </p>
              ) : null}
              <ol className="space-y-3">
                {route.map((stop, index) => (
                  <li
                    key={stop.ticket.ticket_id}
                    className="flex gap-3 rounded-lg border border-border/60 bg-card p-3"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-brass">
                      {index + 1}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{stop.ticket.job_category}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {stop.ticket.district} &middot;{" "}
                        {stop.ticket.customer_name}
                      </p>
                      <Badge variant="outline" className="border-brass/50 text-[10px]">
                        {stop.ticket.job_status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}

          {selectedTech !== "all" && route.length > 1 && (
            <p className="text-xs text-muted-foreground">
              {tripQuery.data
                ? "Street-level driving route optimised by OSRM, starting from Colombo for "
                : "Estimated sequencing from Colombo for "}
              {techName(selectedTech) ?? "this technician"}.
            </p>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "map-tickets"] })}
          >
            Refresh jobs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
