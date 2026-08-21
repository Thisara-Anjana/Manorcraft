import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listCities, listDistricts } from "@/lib/locations.functions";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Dependent District → City / Area pickers. The city selector stays disabled
 * until a district is chosen, and changing district clears the city.
 */
export function LocationSelects({
  districtId,
  cityId,
  onChange,
  districtError,
  cityError,
}: {
  districtId: string;
  cityId: string;
  onChange: (next: { districtId: string; cityId: string }) => void;
  districtError?: string | undefined;
  cityError?: string | undefined;
}) {
  const fetchDistricts = useServerFn(listDistricts);
  const fetchCities = useServerFn(listCities);

  const districts = useQuery({
    queryKey: ["districts"],
    queryFn: () => fetchDistricts({}),
    staleTime: 5 * 60 * 1000,
  });

  const cities = useQuery({
    queryKey: ["cities", districtId],
    queryFn: () => fetchCities({ data: { districtId } }),
    enabled: Boolean(districtId),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">District</Label>
        <Select
          value={districtId}
          onValueChange={(value) => onChange({ districtId: value, cityId: "" })}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder={districts.isPending ? "Loading…" : "Select District"} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {(districts.data ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {districtError && <p className="text-xs text-destructive">{districtError}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          City / Area
        </Label>
        <Select
          value={cityId}
          disabled={!districtId || cities.isPending}
          onValueChange={(value) => onChange({ districtId, cityId: value })}
        >
          <SelectTrigger className="h-11">
            <SelectValue
              placeholder={!districtId ? "Select a district first" : "Select City / Area"}
            />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {(cities.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {cityError && <p className="text-xs text-destructive">{cityError}</p>}
      </div>
    </div>
  );
}
