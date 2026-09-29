import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { z } from "zod";

const globalForDb = globalThis as typeof globalThis & { tvAdsSql?: ReturnType<typeof postgres> };
const poolSize = process.env.DATABASE_POOL_MAX ? z.coerce.number().int().min(1).parse(process.env.DATABASE_POOL_MAX) : undefined;
const client = globalForDb.tvAdsSql ?? postgres(process.env.DATABASE_URL!, { prepare: false, ...(poolSize ? { max: poolSize } : {}) });
if (process.env.NODE_ENV !== "production") globalForDb.tvAdsSql = client;
export const db = drizzle(client, { schema });
