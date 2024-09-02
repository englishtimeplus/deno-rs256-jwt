import { postgres } from "./deps.ts";
import "jsr:@std/dotenv/load";

const databaseUrl = Deno.env.get("POSTGRES_URL");
if (!databaseUrl) throw new Error("No database URL");
const POOL_CONNECTIONS = 20;

export const pool = new postgres.Pool(databaseUrl, POOL_CONNECTIONS, true);


