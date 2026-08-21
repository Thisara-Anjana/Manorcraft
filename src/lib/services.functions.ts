import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { fetchServiceDetail, fetchServices } from "./services.server";

export type { ServiceSummary, ServiceDetail, ServiceReview } from "./services.server";

export const listServices = createServerFn({ method: "GET" }).handler(async () => fetchServices());

export const getServiceDetail = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string().trim().min(1).max(60) }).parse(data))
  .handler(async ({ data }) => fetchServiceDetail(data.slug));
