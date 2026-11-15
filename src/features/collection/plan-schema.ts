import { z } from "zod";
import { plannedQuerySchema } from "@/features/queries/schema";

export const PLANNED_QUERY_LIST = z.array(plannedQuerySchema).max(60);
