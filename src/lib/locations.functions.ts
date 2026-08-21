import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { fetchCities, fetchDistricts } from "./locations.server";

export type { DistrictRow, CityRow } from "./locations.server";

export const listDistricts = createServerFn({ method: "GET" }).handler(async () =>
  fetchDistricts(),
);

export const listCities = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ districtId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => fetchCities(data.districtId));
